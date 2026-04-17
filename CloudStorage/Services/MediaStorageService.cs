using CloudStorage.Models.Media;

namespace CloudStorage.Services;

public interface IMediaStorageService
{
    string GetUserMediaFilesDirectory(string userId);
    string GetUserSnapshotsDirectory(string userId);
    Task<IEnumerable<PendingMediaFile>> StoreFilesAsync(IEnumerable<IFormFile> formFiles, string userId);
    void DeleteMediaFiles(IEnumerable<MediaEntry> mediaEntries, string userId);
}

public class MediaStorageService(IConfiguration configuration) : IMediaStorageService
{
    private const string MediaRootDirectory = "media";
    private const string SnapshotDirectory = "snapshots";
    private const string MediaFileDirectory = "files";
    
    private readonly string _storageDirectory = configuration.GetValue<string>("Storage:Url");

    private string GetUserMediaRootDirectory(string userId) =>
        Path.GetFullPath(Path.Combine(_storageDirectory, userId, MediaRootDirectory));

    private void EnsureUserDirectoriesExist(string userId)
    {
        MediaHelper.CreateDirectoryIfNotExists(GetUserMediaFilesDirectory(userId));
        MediaHelper.CreateDirectoryIfNotExists(GetUserSnapshotsDirectory(userId));
    }

    public string GetUserMediaFilesDirectory(string userId) =>
        Path.GetFullPath(Path.Combine(GetUserMediaRootDirectory(userId), MediaFileDirectory));

    public string GetUserSnapshotsDirectory(string userId) =>
        Path.GetFullPath(Path.Combine(GetUserMediaRootDirectory(userId), SnapshotDirectory));

    public async Task<IEnumerable<PendingMediaFile>> StoreFilesAsync(IEnumerable<IFormFile> formFiles, string userId)
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

    public void DeleteMediaFiles(IEnumerable<MediaEntry> mediaEntries, string userId)
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