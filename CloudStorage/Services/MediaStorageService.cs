using CloudStorage.Models.Media;

namespace CloudStorage.Services;

public interface IMediaStorageService
{
    string GetUserMediaFilesDirectory(Guid userId);
    string GetUserSnapshotsDirectory(Guid userId);
    Task<IEnumerable<PendingMediaFile>> StoreFilesAsync(IEnumerable<IFormFile> formFiles, Guid userId);
    void DeleteMediaFiles(IEnumerable<MediaEntry> mediaEntries, Guid userId);
}

public class MediaStorageService(IConfiguration configuration) : IMediaStorageService
{
    private const string MediaRootDirectory = "media";
    private const string SnapshotDirectory = "snapshots";
    private const string MediaFileDirectory = "files";
    
    private readonly string _storageDirectory = configuration.GetValue<string>("Storage:Url");

    private string GetUserMediaRootDirectory(Guid userId) =>
        Path.GetFullPath(Path.Combine(_storageDirectory, userId.ToString(), MediaRootDirectory));

    private void EnsureUserDirectoriesExist(Guid userId)
    {
        MediaHelper.CreateDirectoryIfNotExists(GetUserMediaFilesDirectory(userId));
        MediaHelper.CreateDirectoryIfNotExists(GetUserSnapshotsDirectory(userId));
    }

    public string GetUserMediaFilesDirectory(Guid userId) =>
        Path.GetFullPath(Path.Combine(GetUserMediaRootDirectory(userId), MediaFileDirectory));

    public string GetUserSnapshotsDirectory(Guid userId) =>
        Path.GetFullPath(Path.Combine(GetUserMediaRootDirectory(userId), SnapshotDirectory));

    public async Task<IEnumerable<PendingMediaFile>> StoreFilesAsync(IEnumerable<IFormFile> formFiles, Guid userId)
    {
        var pendingMediaFiles = new Dictionary<string, PendingMediaFile>();
        var userMediaFolder = GetUserMediaFilesDirectory(userId);
        EnsureUserDirectoriesExist(userId);
        foreach (var formFile in formFiles)
        {
            if (formFile == null || formFile.Length == 0) continue;

            var hash = await MediaHelper.ComputeSha256Async(formFile);
            if (pendingMediaFiles.ContainsKey(hash)) continue;
        
            var fullPath = Path.GetFullPath(Path.Combine(userMediaFolder, hash));
            if (!fullPath.StartsWith(userMediaFolder)) continue;

            try
            {
                await using var stream = File.Create(fullPath);
                await formFile.CopyToAsync(stream);
            
                pendingMediaFiles.TryAdd(hash, new PendingMediaFile
                {
                    OriginalFileName = formFile.FileName,
                    FullPath = fullPath,
                    FileSize = formFile.Length,
                    Hash = hash,
                });
            }
            catch (Exception e)
            {
                Console.WriteLine(e);
            }
        }

        return pendingMediaFiles.Values;
    }

    public void DeleteMediaFiles(IEnumerable<MediaEntry> mediaEntries, Guid userId)
    {
        var mediaFilesFolder = GetUserMediaFilesDirectory(userId);
        var snapshotsFolder = GetUserSnapshotsDirectory(userId);
    
        foreach (var mediaEntry in mediaEntries)
        {
            MediaHelper.DeleteFile(Path.GetFullPath(Path.Combine(mediaFilesFolder, mediaEntry.MediaFile)));
            MediaHelper.DeleteFile(Path.GetFullPath(Path.Combine(snapshotsFolder, mediaEntry.SnapshotFile)));
        }
    }
}