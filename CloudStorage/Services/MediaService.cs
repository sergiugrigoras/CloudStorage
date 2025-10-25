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
        var uploadedFiles = await StoreFilesAsync(files.ToList(), userId);
        await ProcessMediaFilesAsync(uploadedFiles, userId);
    }
    
    private async Task<IEnumerable<UploadFile>> StoreFilesAsync(IEnumerable<IFormFile> formFiles, Guid userId)
    {
        var uploadedFilesInfo = new List<UploadFile>();
        var userMediaFolder = GetUserMediaFilesDirectory(userId);

        foreach (var file in formFiles)
        {
            if (file == null || file.Length == 0) continue;
            
            var combinedPath = Path.Combine(userMediaFolder, file.FileName);
            var fullPath = Path.GetFullPath(combinedPath);
            
            // Ensure unique file names
            fullPath = MediaHelper.EnsureUniqueFileName(fullPath);
            if (!fullPath.StartsWith(userMediaFolder))
                continue;
            
            try
            {
                // Save file to disk
                await using var stream = File.Create(fullPath);
                await file.CopyToAsync(stream);
                stream.Close();
                uploadedFilesInfo.Add(new UploadFile{ FileName = Path.GetFileName(fullPath), FullPath = fullPath, FileSize = file.Length});
            }
            catch (Exception e)
            {
                Console.WriteLine(e);
            }
        }

        return uploadedFilesInfo;
    }
    
    private async Task ProcessMediaFilesAsync(IEnumerable<UploadFile> uploadFiles, Guid userId)
    {
        var mediaFolder = GetUserMediaFilesDirectory(userId);
        var snapshotFolder = GetUserSnapshotsDirectory(userId);

        foreach (var uploadFile in uploadFiles)
        {
            if (uploadFile == null) continue;
            var checksum = await MediaHelper.ComputeMd5Async(uploadFile.FullPath);
            var dbEntry = await UnitOfWork.MediaObjects.Query(x => x.OwnerId == userId && x.Hash == checksum)
                .FirstOrDefaultAsync();

            if (dbEntry == null)
            {
                await AddNewMediaObjectAsync(uploadFile, checksum, userId, snapshotFolder);
            }
            else
            {
                await HandleExistingMediaFileAsync(dbEntry, uploadFile, checksum, mediaFolder, snapshotFolder);
            }
        }

        await UnitOfWork.SaveAsync();
        await Task.WhenAll(SnapshotTasks);
    }

    private async Task AddNewMediaObjectAsync(UploadFile uploadFile, string checksum, Guid userId,
        string snapshotFolder)
    {
        if (string.IsNullOrWhiteSpace(uploadFile?.FullPath)) return;
        var contentType = MimeTypes.GetType(Path.GetExtension(uploadFile.FileName));
        var mediaAnalysis = await FFProbe.AnalyseAsync(uploadFile.FullPath);

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
            UploadFileName = uploadFile.FileName,
            MarkedForDeletion = false,
            FileSize = uploadFile.FileSize,
        };

        await UnitOfWork.MediaObjects.AddAsync(mediaObject);
        var createSnapshotTask = MediaHelper.CreateSnapshotAsync(uploadFile.FullPath, Path.Combine(snapshotFolder, mediaObject.SnapshotFileName), SnapshotSemaphore, mediaAnalysis);
        SnapshotTasks.Add(createSnapshotTask);
    }

    private async Task HandleExistingMediaFileAsync(MediaObject dbEntry, UploadFile uploadFile, string checksum,
        string mediaFolder, string snapshotFolder)
    {
        var existingFile = Path.Combine(mediaFolder, dbEntry.UploadFileName);

        if (dbEntry.UploadFileName != uploadFile.FileName)
        {
            var existingFileChecksum = await MediaHelper.ComputeMd5Async(existingFile);

            if (existingFileChecksum != checksum)
            {
                MediaHelper.DeleteFile(existingFile);
                dbEntry.UploadFileName = uploadFile.FileName;
                dbEntry.FileSize = uploadFile.FileSize;
            }
            else
            {
                MediaHelper.DeleteFile(uploadFile.FullPath);
            }
        }

        dbEntry.MarkedForDeletion = false;
        var createSnapshotTask = MediaHelper.CreateSnapshotAsync(uploadFile.FullPath,
            Path.Combine(snapshotFolder, dbEntry.SnapshotFileName), SnapshotSemaphore);
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

    private class UploadFile
    {
        public string FileName { get; set; }
        public string FullPath { get; set; }
        public long FileSize { get; set; }
    }
}