using CloudStorage.Models;
using CloudStorage.ViewModels;
using FFMpegCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using CloudStorage.Interfaces.Media;

namespace CloudStorage.Services;

public class MediaService(IMediaUnitOfWork unitOfWork, IConfiguration configuration, IServiceProvider serviceProvider) : IMediaService
{
    private string StorageDirectory { get; } = configuration.GetValue<string>("Storage:Url");
    private const string MediaRootDirectory = "media";
    private const string SnapshotDirectory = "snapshots";
    private const string MediaFileDirectory = "files";
    private List<Task> SnapshotTasks { get; } = [];
    private SemaphoreSlim SnapshotSemaphore { get; } = new(10);
    private static string _ffmpegTmpFolder = GlobalFFOptions.Current.TemporaryFilesFolder;

    private IMediaUnitOfWork UnitOfWork { get; } = unitOfWork;

    public async Task<MediaObject> GetMediaObjectByIdAsync(Guid id) => await UnitOfWork.MediaObjects.GetAsync(id);

    public async Task<IEnumerable<MediaObject>> GetMediaObjectsAsync(MediaObjectFilter filter) =>
        await UnitOfWork.MediaObjects.Query(filter.ToExpression()).ToArrayAsync();

    public async Task<Stream> GetSnapshotStreamAsync(Guid id)
    {
        var mediaObject = await GetMediaObjectByIdAsync(id);
        if (mediaObject == null) return null;
        var snapshotFolder = GetUserSnapshotsDirectory(mediaObject.OwnerId);

        var provider = new PhysicalFileProvider(snapshotFolder);
        var fileInfo = provider.GetFileInfo(mediaObject.SnapshotFile);
        if (fileInfo.Exists)
            return fileInfo.CreateReadStream();

        // Try to create a new snapshot if the file doesn't exist.
        var mediaFileFolder = GetUserMediaFilesDirectory(mediaObject.OwnerId);
        var mediaFile = Path.GetFullPath(Path.Combine(mediaFileFolder, mediaObject.MediaFile));
        if (!File.Exists(mediaFile)) 
            return null;
        
        try
        {
            var snapshotFile = Path.GetFullPath(Path.Combine(snapshotFolder, mediaObject.SnapshotFile));
            await MediaHelper.CreateSnapshotAsync(mediaFile, snapshotFile, SnapshotSemaphore);
            fileInfo = provider.GetFileInfo(mediaObject.SnapshotFile);
            return fileInfo.Exists ? fileInfo.CreateReadStream() : null;
        }
        catch (Exception e)
        {
            Console.WriteLine(e.Message);
            return null;
        }
    }

    public async Task<Stream> GetMediaStreamAsync(Guid id)
    {
        var mediaObject = await GetMediaObjectByIdAsync(id);
        if (mediaObject == null) return null;
        var mediaFileFolder = GetUserMediaFilesDirectory(mediaObject.OwnerId);
        var provider = new PhysicalFileProvider(mediaFileFolder);
        var fileInfo = provider.GetFileInfo(mediaObject.MediaFile);
        return fileInfo.Exists ? fileInfo.CreateReadStream() : null;
    }
    
    public async Task<bool?> ToggleFavorite(Guid id)
    {
        var mediaObject = await GetMediaObjectByIdAsync(id);
        if (mediaObject == null) return null;
        
        mediaObject.Favorite = !mediaObject.Favorite;
        await UnitOfWork.SaveAsync();
        return mediaObject.Favorite;
    }

    public async Task<List<MediaObject>> UploadMediaFilesAsync(IEnumerable<IFormFile> files, Guid userId)
    {
        var uploadedFiles = await StoreFilesAsync(files.ToList(), userId);
        return await ProcessMediaFilesAsync(uploadedFiles, userId);
    }
    
    private async Task<IEnumerable<UploadFile>> StoreFilesAsync(IEnumerable<IFormFile> formFiles, Guid userId)
    {
        var uploadedFilesInfo = new Dictionary<string, UploadFile>();
        var userMediaFolder = GetUserMediaFilesDirectory(userId);

        foreach (var formFile in formFiles)
        {
            if (formFile == null || formFile.Length == 0) continue;
            
            var hash = await MediaHelper.ComputeSha256Async(formFile);
            if (uploadedFilesInfo.ContainsKey(hash)) continue;
            var fullPath = Path.GetFullPath(Path.Combine(userMediaFolder, hash));
            
            if (!fullPath.StartsWith(userMediaFolder))
                continue;
            
            try
            {
                // Save file to disk
                await using var stream = File.Create(fullPath);
                await formFile.CopyToAsync(stream);
                stream.Close();
                var fileInfo = new UploadFile
                {
                    OriginalFileName = formFile.FileName,
                    FullPath = fullPath,
                    FileSize = formFile.Length,
                    Hash = hash,
                };
                uploadedFilesInfo.TryAdd(hash, fileInfo);
            }
            catch (Exception e)
            {
                Console.WriteLine(e);
            }
        }

        return uploadedFilesInfo.Values;
    }
    
    private async Task<List<MediaObject>> ProcessMediaFilesAsync(IEnumerable<UploadFile> uploadFiles, Guid userId)
    {
        var snapshotFolder = GetUserSnapshotsDirectory(userId);
        var result = new List<MediaObject>();
        foreach (var uploadFile in uploadFiles)
        {
            if (uploadFile == null) continue;
            
            var dbEntry = await UnitOfWork.MediaObjects.Query(x => x.OwnerId == userId && x.Hash == uploadFile.Hash)
                .FirstOrDefaultAsync();
            
            try
            {
                var mediaObject = await AddOrUpdateMediaObjectAsync(dbEntry, uploadFile, userId, snapshotFolder);
                result.Add(mediaObject);
            }
            catch (Exception e)
            {
                Console.WriteLine(e);
            }
        }

        await UnitOfWork.SaveAsync();
        await Task.WhenAll(SnapshotTasks);
        SnapshotTasks.Clear();
        return result;
    }

    private async Task<MediaObject> AddOrUpdateMediaObjectAsync(MediaObject dbEntry, UploadFile uploadFile, Guid userId, string snapshotFolder)
    {
        if (string.IsNullOrWhiteSpace(uploadFile?.FullPath)) throw new ArgumentNullException(nameof(uploadFile));
        if (userId == Guid.Empty) throw new ArgumentNullException(nameof(userId));
        
        var contentType = MimeTypes.GetType(Path.GetExtension(uploadFile.OriginalFileName));
        var mediaAnalysis = await FFProbe.AnalyseAsync(uploadFile.FullPath);

        MediaObject mediaObject;

        if (dbEntry == null)
        {
            mediaObject = new MediaObject
            {
                Id = Guid.NewGuid(),
                ContentType = contentType,
                Favorite = false,
                Hash = uploadFile.Hash,
                Width = mediaAnalysis.PrimaryVideoStream?.Width,
                Height = mediaAnalysis.PrimaryVideoStream?.Height,
                Duration = Convert.ToInt32(mediaAnalysis.PrimaryVideoStream?.Duration.TotalMilliseconds),
                OwnerId = userId,
                UploadFileName = uploadFile.OriginalFileName,
                MarkedForDeletion = false,
                FileSize = uploadFile.FileSize,
            };
            
            await UnitOfWork.MediaObjects.AddAsync(mediaObject);
        }
        else
        {
            dbEntry.ContentType = contentType;
            dbEntry.Hash = uploadFile.Hash;
            dbEntry.Width = mediaAnalysis.PrimaryVideoStream?.Width;
            dbEntry.Height = mediaAnalysis.PrimaryVideoStream?.Height;
            dbEntry.Duration = Convert.ToInt32(mediaAnalysis.PrimaryVideoStream?.Duration.TotalMilliseconds);
            dbEntry.UploadFileName = uploadFile.OriginalFileName;
            dbEntry.MarkedForDeletion = false;
            dbEntry.FileSize = uploadFile.FileSize;

            mediaObject = dbEntry;
        }
        
        var snapshotFullPath = Path.GetFullPath(Path.Combine(snapshotFolder, mediaObject.SnapshotFile));
        var createSnapshotTask = MediaHelper.CreateSnapshotAsync(
            uploadFile.FullPath,
            snapshotFullPath,
            SnapshotSemaphore,
            mediaAnalysis
        );
        SnapshotTasks.Add(createSnapshotTask);

        return mediaObject;
    }

    private string GetUserMediaRootDirectory(Guid userId) =>
        Path.GetFullPath(Path.Combine(StorageDirectory, userId.ToString(), MediaRootDirectory));
    
    private string GetUserMediaFilesDirectory(Guid userId)
    {
        var mediaFilesFolder = Path.GetFullPath(Path.Combine(GetUserMediaRootDirectory(userId), MediaFileDirectory));
        MediaHelper.CreateDirectoryIfNotExists(mediaFilesFolder);
        return mediaFilesFolder;
    }

    private string GetUserSnapshotsDirectory(Guid userId)
    {
        var snapshotsFolder = Path.GetFullPath(Path.Combine(GetUserMediaRootDirectory(userId), SnapshotDirectory));
        MediaHelper.CreateDirectoryIfNotExists(snapshotsFolder);
        return snapshotsFolder;
    }

    public async Task CreateAlbumAsync(Guid userId, string name)
    {
        var album = new MediaAlbum
        {
            Id = Guid.NewGuid(),
            OwnerId = userId,
            Name = name,
            CreateDate = DateTime.UtcNow,
        };
        
        await UnitOfWork.MediaAlbums.AddAsync(album);
        await UnitOfWork.SaveAsync();
    }

    public async Task<IEnumerable<MediaAlbum>> GetAllUserAlbumsAsync(Guid userId)
    {
        var albums = await UnitOfWork.MediaAlbums
            .Query(x => x.OwnerId == userId)
            .ToListAsync();
        return albums;
    }

    public async Task AddMediaToAlbumAsync(Guid userId, IEnumerable<Guid> mediaIds, IEnumerable<Guid> albumIds)
    {
        if (mediaIds == null || albumIds == null) return;
        var filter = new MediaObjectFilter
        {
            UserId = userId,
            Ids = mediaIds,
        };
        var mediaObjects = await UnitOfWork.MediaObjects.Query(filter.ToExpression())
            .ToListAsync();
        foreach (var albumId in albumIds)
        {
            var album = await UnitOfWork.MediaAlbums.GetAlbumByIdAsync(albumId, userId, true);
            if (album == null) continue;
            MediaHelper.AddMediaToAlbum(album, mediaObjects);
        }

        await UnitOfWork.SaveAsync();
    }

    public async Task<bool> UniqueAlbumNameAsync(Guid userId, string name)
    {
        var album = await UnitOfWork.MediaAlbums.GetAlbumByNameAsync(name, userId);
        return album == null;
    }

    public async Task<IEnumerable<MediaObject>> GetAlbumContentAsync(Guid userId, string albumName)
    {
        var album = await UnitOfWork.MediaAlbums.GetAlbumByNameAsync(albumName, userId, true);
        return album == null ? [] : album.MediaObjects.Where(x => !x.MarkedForDeletion);
    }

    public async Task<List<Guid>> DeleteMediaObjectsAsync(Guid userId, MediaObjectFilter filter, bool permanent)
    {
        var expression = filter.ToExpression();
        var mediaObjects = await UnitOfWork.MediaObjects.Query(expression).ToListAsync();
        if (permanent)
        {
            var mediaFilesFolder = GetUserMediaFilesDirectory(userId);
            var snapshotsFolder = GetUserSnapshotsDirectory(userId);
            foreach (var mediaObject in mediaObjects)
            {
                MediaHelper.DeleteFile(Path.GetFullPath(Path.Combine(mediaFilesFolder, mediaObject.MediaFile)));
                MediaHelper.DeleteFile(Path.GetFullPath(Path.Combine(snapshotsFolder, mediaObject.SnapshotFile)));
            }

            UnitOfWork.MediaObjects.DeleteMany(mediaObjects);
        }
        else
        {
            foreach (var media in mediaObjects)
                media.MarkedForDeletion = true;
        }
        await UnitOfWork.SaveAsync();
        return mediaObjects.Select(x => x.Id).ToList();
    }

    public async Task RestoreMediaObjectsAsync(MediaObjectFilter filter)
    {
        var mediaObjects = await UnitOfWork.MediaObjects.Query(filter.ToExpression()).ToListAsync();
        foreach (var mediaObject in mediaObjects)
            mediaObject.MarkedForDeletion = false;

        await UnitOfWork.SaveAsync();
    }

    private class UploadFile
    {
        public string OriginalFileName { get; set; }
        public string FullPath { get; set; }
        public long FileSize { get; set; }
        public string Hash { get; set; }
    }
}