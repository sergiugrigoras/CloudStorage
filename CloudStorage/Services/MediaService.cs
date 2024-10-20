using CloudStorage.Models;
using CloudStorage.ViewModels;
using FFMpegCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using CloudStorage.Interfaces.Media;

namespace CloudStorage.Services;

public class MediaService(IMediaUnitOfWork unitOfWork, IConfiguration configuration, IServiceProvider serviceProvider) : IMediaService
{
    private string StorageDirectory { get; } = configuration.GetValue<string>("Storage:url");
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
        var fileInfo = provider.GetFileInfo(mediaObject.SnapshotFileName);
        if (fileInfo.Exists)
            return fileInfo.CreateReadStream();

        // Try to create a new snapshot if the file doesn't exist.
        var mediaFileFolder = GetUserMediaFilesDirectory(mediaObject.OwnerId);
        var mediaFile = Path.Combine(mediaFileFolder, mediaObject.UploadFileName);
        if (!File.Exists(mediaFile)) 
            return null;
        
        try
        {
            var snapshotFile = Path.Combine(snapshotFolder, mediaObject.SnapshotFileName);
            await MediaHelper.CreateSnapshotAsync(mediaFile, snapshotFile, SnapshotSemaphore);
            fileInfo = provider.GetFileInfo(mediaObject.SnapshotFileName);
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
        var fileInfo = provider.GetFileInfo(mediaObject.UploadFileName);
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

    public async Task UploadMediaFilesAsync(IEnumerable<IFormFile> files, Guid userId)
    {
        var fileList = await StoreFilesAsync(files, userId);
        await ProcessMediaFilesAsync(fileList, userId);
    }
    
    private async Task<IEnumerable<string>> StoreFilesAsync(IEnumerable<IFormFile> files, Guid userId)
    {
        var result = new List<string>();
        var mediaFolder = GetUserMediaFilesDirectory(userId);

        foreach (var file in files)
        {
            var fileName = file.FileName;
            var mediaFilePath = Path.Combine(mediaFolder, fileName);

            // Ensure unique file names
            mediaFilePath = MediaHelper.EnsureUniqueFileName(mediaFilePath);

            // Save file to disk
            await using var stream = File.Create(mediaFilePath);
            await file.CopyToAsync(stream);
            stream.Close();
        
            result.Add(mediaFilePath);
        }

        return result;
    }
    
    private async Task ProcessMediaFilesAsync(IEnumerable<string> mediaFiles, Guid userId)
    {
        var mediaFolder = GetUserMediaFilesDirectory(userId);
        var snapshotFolder = GetUserSnapshotsDirectory(userId);

        foreach (var mediaFile in mediaFiles)
        {
            var checksum = await MediaHelper.ComputeMd5Async(mediaFile);
            var fileName = Path.GetFileName(mediaFile);

            var dbEntry = await UnitOfWork.MediaObjects.Query(x => x.OwnerId == userId && x.Hash == checksum)
                .FirstOrDefaultAsync();

            if (dbEntry == null)
            {
                await AddNewMediaObjectAsync(mediaFile, checksum, fileName, userId, snapshotFolder);
            }
            else
            {
                await HandleExistingMediaFileAsync(dbEntry, mediaFile, checksum, fileName, mediaFolder, snapshotFolder);
            }
        }

        await UnitOfWork.SaveAsync();
        await Task.WhenAll(SnapshotTasks);
    }

    private async Task AddNewMediaObjectAsync(string mediaFile, string checksum, string fileName, Guid userId,
        string snapshotFolder)
    {
        var contentType = FsoService.GetMimeType(Path.GetExtension(mediaFile));
        var mediaAnalysis = await FFProbe.AnalyseAsync(mediaFile);

        var mediaObject = new MediaObject
        {
            Id = Guid.NewGuid(),
            ContentType = contentType,
            Favorite = false,
            Hash = checksum,
            Width = mediaAnalysis.PrimaryVideoStream?.Width,
            Height = mediaAnalysis.PrimaryVideoStream?.Height,
            Duration = Convert.ToInt32(mediaAnalysis.PrimaryVideoStream?.Duration.TotalMilliseconds),
            OwnerId = userId,
            UploadFileName = fileName,
            MarkedForDeletion = false
        };

        await UnitOfWork.MediaObjects.AddAsync(mediaObject);
        var createSnapshotTask = MediaHelper.CreateSnapshotAsync(mediaFile, Path.Combine(snapshotFolder, mediaObject.SnapshotFileName), SnapshotSemaphore, mediaAnalysis);
        SnapshotTasks.Add(createSnapshotTask);
    }

    private async Task HandleExistingMediaFileAsync(MediaObject dbEntry, string mediaFile, string checksum,
        string fileName, string mediaFolder, string snapshotFolder)
    {
        var existingFile = Path.Combine(mediaFolder, dbEntry.UploadFileName);

        if (dbEntry.UploadFileName != fileName)
        {
            var existingFileChecksum = await MediaHelper.ComputeMd5Async(existingFile);

            if (existingFileChecksum != checksum)
            {
                MediaHelper.DeleteFile(existingFile);
                dbEntry.UploadFileName = fileName;
            }
            else
            {
                MediaHelper.DeleteFile(mediaFile);
            }
        }

        dbEntry.MarkedForDeletion = false;
        var createSnapshotTask = MediaHelper.CreateSnapshotAsync(mediaFile, Path.Combine(snapshotFolder, dbEntry.SnapshotFileName), SnapshotSemaphore);
        SnapshotTasks.Add(createSnapshotTask);
    }
    
    private string GetUserMediaRootDirectory(Guid userId) => Path.Combine(StorageDirectory, userId.ToString(), MediaRootDirectory);
    
    private string GetUserMediaFilesDirectory(Guid userId)
    {
        var mediaFilesFolder = Path.Combine(GetUserMediaRootDirectory(userId), MediaFileDirectory);
        MediaHelper.CreateDirectoryIfNotExists(mediaFilesFolder);
        return mediaFilesFolder;
    }

    private string GetUserSnapshotsDirectory(Guid userId)
    {
        var snapshotsFolder = Path.Combine(GetUserMediaRootDirectory(userId), SnapshotDirectory);
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

    public async Task DeleteMediaObjectsAsync(Guid userId, MediaObjectFilter filter, bool permanent)
    {
        var expression = filter.ToExpression();
        var mediaObjects = await UnitOfWork.MediaObjects.Query(expression).ToListAsync();
        if (permanent)
        {
            var mediaFilesFolder = GetUserMediaFilesDirectory(userId);
            var snapshotsFolder = GetUserSnapshotsDirectory(userId);
            foreach (var mediaObject in mediaObjects)
            {
                MediaHelper.DeleteFile(Path.Combine(mediaFilesFolder, mediaObject.UploadFileName));
                MediaHelper.DeleteFile(Path.Combine(snapshotsFolder, mediaObject.SnapshotFileName));
            }

            UnitOfWork.MediaObjects.DeleteMany(mediaObjects);
        }
        else
        {
            foreach (var media in mediaObjects)
                media.MarkedForDeletion = true;
        }
        await UnitOfWork.SaveAsync();
    }

    public async Task RestoreMediaObjectsAsync(MediaObjectFilter filter)
    {
        var mediaObjects = await UnitOfWork.MediaObjects.Query(filter.ToExpression()).ToListAsync();
        foreach (var mediaObject in mediaObjects)
            mediaObject.MarkedForDeletion = false;

        await UnitOfWork.SaveAsync();
    }
}