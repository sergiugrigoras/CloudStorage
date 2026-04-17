using System.Net.Mime;
using CloudStorage.Extensions;
using FFMpegCore;
using Microsoft.Extensions.FileProviders;
using CloudStorage.Models.Media;
using CloudStorage.Repositories.Media;
using MongoDB.Bson;

namespace CloudStorage.Services;

public interface IMediaService
{
    Task<List<MediaEntry>> GetMediaEntriesAsync(MediaEntryQuery query);
    Task<MediaEntry> GetMediaEntryByIdAsync(string id);
    Task<MediaEntry> GetMediaEntryForContentDeliveryAsync(string id);
    Task<MediaFileResult> GetSnapshotStreamAsync(MediaEntry mediaEntry);
    MediaFileResult GetMediaStream(MediaEntry mediaEntry);

    Task<bool?> ToggleFavorite(string id);
    Task<List<MediaEntry>> UploadMediaFilesAsync(IEnumerable<IFormFile> files);
    Task<MediaAlbum> CreateAlbumAsync(string name);
    Task<List<MediaAlbum>> GetAlbumsAsync();
    Task AddToAlbumAsync(IEnumerable<string> mediaIds, IEnumerable<string> albumIds);
    Task<bool> AlbumExistsAsync(string name);
    Task<List<MediaEntry>> GetAlbumContentAsync(string albumName);
    Task DeleteMediaEntriesAsync(IEnumerable<string> ids, bool permanent);
    Task RestoreMediaEntriesAsync(IEnumerable<string> ids);

    string GenerateContentAccessKey();
    void RemoveContentAccessKey();
    bool ValidateContentAccessKey(string userId, string key);
}

public class MediaService(
    ICurrentUser currentUser,
    IMediaStorageService mediaStorageService,
    IMediaEntryRepository mediaEntryRepository,
    IMediaEntrySystemRepository mediaEntrySystemRepository,
    IMediaAlbumRepository mediaAlbumRepository,
    ContentAuthorization contentAuthorization) : IMediaService
{
    private readonly ICurrentUser _currentUser = currentUser ?? throw new ArgumentNullException(nameof(currentUser));

    private readonly IMediaStorageService _mediaStorageService = mediaStorageService ?? throw new ArgumentNullException(nameof(mediaStorageService));
    private readonly IMediaEntryRepository _mediaEntryRepository =
        mediaEntryRepository ?? throw new ArgumentNullException(nameof(mediaEntryRepository));
    
    private readonly IMediaEntrySystemRepository _mediaEntrySystemRepository =
        mediaEntrySystemRepository ?? throw new ArgumentNullException(nameof(mediaEntrySystemRepository));

    private readonly IMediaAlbumRepository _mediaAlbumRepository =
        mediaAlbumRepository ?? throw new ArgumentNullException(nameof(mediaAlbumRepository));

    private readonly ContentAuthorization _contentAuthorization =
        contentAuthorization ?? throw new ArgumentNullException(nameof(contentAuthorization));
    
    private const string SnapshotContentType = MediaTypeNames.Image.Jpeg;
    private List<Task> SnapshotTasks { get; } = [];
    private SemaphoreSlim SnapshotSemaphore { get; } = new(10);
    private static string _ffmpegTmpFolder = GlobalFFOptions.Current.TemporaryFilesFolder;

    public Task<MediaEntry> GetMediaEntryByIdAsync(string id) =>
        _mediaEntryRepository.GetOneAsync(id, _currentUser.UserId);

    public Task<MediaEntry> GetMediaEntryForContentDeliveryAsync(string id) =>
        _mediaEntrySystemRepository.GetOneAsync(id);

    public Task<List<MediaEntry>> GetMediaEntriesAsync(MediaEntryQuery query)
    {
        ArgumentNullException.ThrowIfNull(query);
        return _mediaEntryRepository.SearchAsync(query.Favorite, query.Deleted, query.Ids,
            _currentUser.UserId);
    }

    public async Task<MediaFileResult> GetSnapshotStreamAsync(MediaEntry mediaEntry)
    {
        if (mediaEntry == null)
            return null;

        var snapshotFolder = _mediaStorageService.GetUserSnapshotsDirectory(mediaEntry.UserId);
        var provider = new PhysicalFileProvider(snapshotFolder);
        var fileInfo = provider.GetFileInfo(mediaEntry.SnapshotFile);
    
        if (fileInfo.Exists)
            return new MediaFileResult(fileInfo.CreateReadStream(), SnapshotContentType);

        var mediaFileFolder = _mediaStorageService.GetUserMediaFilesDirectory(mediaEntry.UserId);
        var mediaFile = Path.GetFullPath(Path.Combine(mediaFileFolder, mediaEntry.MediaFile));
        if (!File.Exists(mediaFile))
            return null;

        try
        {
            var snapshotFile = Path.GetFullPath(Path.Combine(snapshotFolder, mediaEntry.SnapshotFile));
            await MediaHelper.CreateSnapshotAsync(mediaFile, snapshotFile, SnapshotSemaphore);
            fileInfo = provider.GetFileInfo(mediaEntry.SnapshotFile);
            return fileInfo.Exists ? new MediaFileResult(fileInfo.CreateReadStream(), SnapshotContentType) : null;
        }
        catch (Exception e)
        {
            Console.WriteLine(e.Message);
            return null;
        }
    }

    public MediaFileResult GetMediaStream(MediaEntry mediaEntry)
    {
        if (mediaEntry == null)
            return null;

        var mediaFileFolder = _mediaStorageService.GetUserMediaFilesDirectory(mediaEntry.UserId);
        var provider = new PhysicalFileProvider(mediaFileFolder);
        var fileInfo = provider.GetFileInfo(mediaEntry.MediaFile);
        return fileInfo.Exists ? new MediaFileResult(fileInfo.CreateReadStream(), mediaEntry.ContentType) : null;
    }

    public async Task<bool?> ToggleFavorite(string id)
    {
        var mediaEntry = await GetMediaEntryByIdAsync(id);
        if (mediaEntry == null)
            return null;
        var result =
            await _mediaEntryRepository.SetFavoriteAsync(mediaEntry.Id, _currentUser.UserId, !mediaEntry.Favorite);
        return result?.Favorite;
    }

    public async Task<List<MediaEntry>> UploadMediaFilesAsync(IEnumerable<IFormFile> files)
    {
        var uploadedFiles = await _mediaStorageService.StoreFilesAsync(files, _currentUser.UserId);
        return await ProcessMediaFilesAsync(uploadedFiles);
    }

    private async Task<List<MediaEntry>> ProcessMediaFilesAsync(IEnumerable<PendingMediaFile> uploadFiles)
    {
        var snapshotFolder = _mediaStorageService.GetUserSnapshotsDirectory(_currentUser.UserId);
        var result = new List<MediaEntry>();
        foreach (var uploadFile in uploadFiles)
        {
            if (uploadFile == null) continue;

            try
            {
                var mediaEntry = await AddOrUpdateMediaEntryAsync(uploadFile, snapshotFolder);
                result.Add(mediaEntry);
            }
            catch (Exception e)
            {
                Console.WriteLine(e);
            }
        }

        await Task.WhenAll(SnapshotTasks);
        SnapshotTasks.Clear();
        return result;
    }

    private async Task<MediaEntry> AddOrUpdateMediaEntryAsync(PendingMediaFile pendingMediaFile, string snapshotFolder)
    {
        if (string.IsNullOrWhiteSpace(pendingMediaFile?.FullPath))
            throw new ArgumentNullException(nameof(pendingMediaFile));

        var contentType = MimeTypes.GetType(Path.GetExtension(pendingMediaFile.OriginalFileName));
        var mediaAnalysis = await FFProbe.AnalyseAsync(pendingMediaFile.FullPath);

        var existing = await _mediaEntryRepository.GetByHashAsync(pendingMediaFile.Hash, _currentUser.UserId);

        var mediaEntry = existing ?? new MediaEntry { Favorite = false };

        mediaEntry.ContentType = contentType;
        mediaEntry.Hash = pendingMediaFile.Hash;
        mediaEntry.Width = mediaAnalysis.PrimaryVideoStream?.Width;
        mediaEntry.Height = mediaAnalysis.PrimaryVideoStream?.Height;
        mediaEntry.Duration = Convert.ToInt32(mediaAnalysis.PrimaryVideoStream?.Duration.TotalMilliseconds);
        mediaEntry.UploadFileName = pendingMediaFile.OriginalFileName!;
        mediaEntry.MarkedForDeletion = false;
        mediaEntry.FileSize = pendingMediaFile.FileSize;

        if (existing == null)
            await _mediaEntryRepository.CreateAsync(mediaEntry, _currentUser.UserId);
        else
            mediaEntry = await _mediaEntryRepository.UpdateAsync(mediaEntry, _currentUser.UserId);

        var snapshotFullPath = Path.GetFullPath(Path.Combine(snapshotFolder, mediaEntry.SnapshotFile));
        var createSnapshotTask = MediaHelper.CreateSnapshotAsync(
            pendingMediaFile.FullPath,
            snapshotFullPath,
            SnapshotSemaphore,
            mediaAnalysis
        );
        SnapshotTasks.Add(createSnapshotTask);

        return mediaEntry;
    }
    
    public async Task<MediaAlbum> CreateAlbumAsync(string name)
    {
        var album = new MediaAlbum { Name = name };

        await _mediaAlbumRepository.CreateAsync(album, _currentUser.UserId);
        return album;
    }

    public Task<List<MediaAlbum>> GetAlbumsAsync() => _mediaAlbumRepository.GetAlbumsAsync(_currentUser.UserId);

    public Task AddToAlbumAsync(IEnumerable<string> mediaIds, IEnumerable<string> albumIds)
    {
        if (mediaIds == null || albumIds == null) return Task.CompletedTask;
        return _mediaAlbumRepository.AddMediaEntriesToAlbumsAsync(mediaIds, albumIds,
            _currentUser.UserId);
    }

    public Task<bool> AlbumExistsAsync(string name) => _mediaAlbumRepository.ExistsAsync(name, _currentUser.UserId);

    public async Task<List<MediaEntry>> GetAlbumContentAsync(string albumName)
    {
        var album = await _mediaAlbumRepository.GetAlbumByNameAsync(albumName, _currentUser.UserId);
        if (album == null)
            throw new InvalidOperationException($"Album {albumName} not found");
        var mediaEntries =
            await _mediaEntryRepository.SearchAsync(null, false, album.MediaEntries ?? [], _currentUser.UserId);
        return mediaEntries;
    }

    public async Task DeleteMediaEntriesAsync(IEnumerable<string> ids, bool permanent)
    {
        var mediaEntries = await _mediaEntryRepository.SearchAsync(null, null, ids, _currentUser.UserId);
    
        if (permanent)
        {
            await _mediaEntryRepository.DeleteManyAsync(mediaEntries.Select(x => x.Id), _currentUser.UserId);
            await _mediaAlbumRepository.PullMediaEntriesAsync(mediaEntries.Select(x => x.Id), _currentUser.UserId);
            _mediaStorageService.DeleteMediaFiles(mediaEntries, _currentUser.UserId);
        }
        else
        {
            await _mediaEntryRepository.SetDeletedAsync(mediaEntries.Select(x => x.Id), _currentUser.UserId, true);
        }
    }

    public Task RestoreMediaEntriesAsync(IEnumerable<string> ids) =>
        _mediaEntryRepository.SetDeletedAsync(ids, _currentUser.UserId, false);

    public string GenerateContentAccessKey() =>
        _contentAuthorization.GenerateKeyForUser(_currentUser.UserId);

    public void RemoveContentAccessKey() => _contentAuthorization.RemoveKeyForUser(_currentUser.UserId);
    public bool ValidateContentAccessKey(string userId, string key) => _contentAuthorization.ValidKey(userId, key);
}