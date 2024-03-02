using System.Diagnostics;
using CloudStorage.Models;
using CloudStorage.ViewModels;
using FFMpegCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using System.Drawing;
using System.Security.Cryptography;
using static System.Net.Mime.MediaTypeNames;
using FFMpegCore.Enums;
using Microsoft.AspNetCore.Components.Forms;
using System.Net.Http.Headers;

namespace CloudStorage.Services;

public interface IMediaService 
{
    Task<IEnumerable<MediaObjectViewModel>> GetAllMediaFilesAsync(User user, MediaObjectFilter filter);
    Task<Stream> GetSnapshotAsync(User user, Guid mediaFileId);
    Task<Stream> GetMediaAsync(Guid id);
    Task<MediaObject> GetMediaObjectByIdAsync(Guid id);
    Task ParseMediaFolderAsync(User user);
    Task<bool> ToggleFavorite(Guid id);
    Task UploadMediaFileAsync(IFormFile file, User user);
    Task CreateAlbumAsync(User user, string name);
    Task <IEnumerable<MediaAlbum>> GetAllAlbumsAsync(User user);
    Task AddMediaToAlbumAsync(User user, ICollection<Guid> mediaIds, ICollection<Guid> albumIds);
    Task<bool> UniqueAlbumNameAsync(User user, string name);
    Task<IEnumerable<MediaObjectViewModel>> GetAlbumContentAsync(User user, string albumName);
    Task<IEnumerable<Guid>> DeleteMediaObjectsAsync(User user, MediaObjectFilter filter, bool permanent);
    Task<IEnumerable<Guid>> RestoreMediaObjectsAsync(User user, MediaObjectFilter filter);
}
public class MediaService(AppDbContext context, IConfiguration configuration) : IMediaService
{
    private readonly string _storageUrl = configuration.GetValue<string>("Storage:url");
    private const string MediaDirName = "media";
    private const string SnapshotsDirName = "snapshots";
    private static IEnumerable<string> _mediaExtentions = new[] { "jpg", "gif", "png", "mp4" };
    private static string _ffmpegTmpFolder = GlobalFFOptions.Current.TemporaryFilesFolder;

    public async Task<IEnumerable<MediaObjectViewModel>> GetAllMediaFilesAsync(User user, MediaObjectFilter filter)
    {
        var expression = filter.ToExpression().AndAlso(x => x.OwnerId == user.Id);
        return await context.MediaObjects
            .Where(expression)
            .Select(x => new MediaObjectViewModel(x))
            .ToListAsync();
    }

    public async Task<Stream> GetSnapshotAsync(User user, Guid mediaFileId)
    {
        if (user == null) ThrowException(401, "Unauthorized.");
        var mediaObject = await context.MediaObjects.FindAsync(mediaFileId);
        if (mediaObject == null) ThrowException(404, "Object not found.");
        if (mediaObject.OwnerId != user.Id) ThrowException(403, "Forbidden content.");

        var provider = new PhysicalFileProvider(GetUserSnapshotsFolder(user.Id));
        var fileInfo = provider.GetFileInfo(mediaObject.Snapshot);
        if (fileInfo.Exists)
            return fileInfo.CreateReadStream();
        else
        {
            var mediaFile = Path.Combine(GetUserMediaFolder(user.Id), mediaObject.UploadFileName);
            var snapshotFile = Path.Combine(GetUserSnapshotsFolder(user.Id), mediaObject.Snapshot);
            if (!File.Exists(mediaFile)) return Stream.Null;
            await CreateSnapshotAsync(mediaFile, snapshotFile);
            fileInfo = provider.GetFileInfo(mediaObject.Snapshot);
            return fileInfo.Exists ? fileInfo.CreateReadStream() : Stream.Null;
        }
    }

    public async Task<Stream> GetMediaAsync(Guid id)
    {
        var mediaObject = await GetMediaObjectByIdAsync(id);
        if (mediaObject == null) return null;
        var mediaFolderRoot = GetUserMediaFolder(mediaObject.OwnerId);
        var provider = new PhysicalFileProvider(mediaFolderRoot);
        var fileInfo = provider.GetFileInfo(mediaObject.UploadFileName);
        if (!fileInfo.Exists) return null;
        return fileInfo.CreateReadStream();
    }

    public async Task<MediaObject> GetMediaObjectByIdAsync(Guid id)
    {
        var mediaObject = await context.MediaObjects.FindAsync(id);
        return mediaObject;
    }

    private static async Task<string> CalculateMD5Async(string filename)
    {
        if (!File.Exists(filename)) return null;
        return await Task.Run(() =>
        {
            using var md5 = MD5.Create();
            using var stream = File.OpenRead(filename);
            var hash = md5.ComputeHash(stream);
            return BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();
        });

    }

    public async Task ParseMediaFolderAsync(User user)
    {
        var mediaFolder = Path.Combine(_storageUrl, user.Id.ToString(), MediaDirName);
        var mediaFiles = Directory.EnumerateFiles(mediaFolder, "*.*", SearchOption.TopDirectoryOnly)
            .Where(s => _mediaExtentions.Contains(Path.GetExtension(s).TrimStart('.').ToLowerInvariant()));
        ICollection<Guid> existingFilesMediaObjectIds = new List<Guid>();
        foreach (var file in mediaFiles)
        {
            var id = await ProcessMediaFileAsync(file, user.Id);
            existingFilesMediaObjectIds.Add(id);
        }

        var mediaObjectsNoFile = await context.MediaObjects.Where(x => x.OwnerId == user.Id && !existingFilesMediaObjectIds.Contains(x.Id)).ToArrayAsync();
        if (mediaObjectsNoFile.Any())
        {
            var snapshotFolder = GetUserSnapshotsFolder(user.Id);
            foreach (var mediaObject in mediaObjectsNoFile)
                DeleteFile(Path.Combine(snapshotFolder, mediaObject.Snapshot));

            context.MediaObjects.RemoveRange(mediaObjectsNoFile);
            await context.SaveChangesAsync();
        }
    }

    public async Task<bool> ToggleFavorite(Guid id)
    {
        var mediaObject = await context.MediaObjects.FindAsync(id);
        if (mediaObject == null)
        {
            ThrowException(404, "Object not found.");
            return false;
        }
        mediaObject.Favorite = !mediaObject.Favorite;
        await context.SaveChangesAsync();
        return mediaObject.Favorite;
    }

    private async Task<Guid> ProcessMediaFileAsync(string mediaFile, Guid userId)
    {
        var mediaFolder = GetUserMediaFolder(userId);
        var snapshotFolder = GetUserSnapshotsFolder(userId);
        var checksum = await CalculateMD5Async(mediaFile);
        var mediaFileName = Path.GetFileName(mediaFile);

        var mediaObject = await context.MediaObjects.FirstOrDefaultAsync(x => x.OwnerId == userId && x.Hash == checksum);
        if (mediaObject != null && mediaObject.UploadFileName == Path.GetFileName(mediaFile))
        {
            return mediaObject.Id;
        }
        else if (mediaObject != null && mediaObject.UploadFileName != mediaFileName)
        {
            var existingFile = Path.Combine(mediaFolder, mediaObject.UploadFileName);
            var existingFileChecksum = await CalculateMD5Async(existingFile);
            if (existingFileChecksum == checksum)
            {
                DeleteFile(mediaFile);
                return mediaObject.Id;
            }
            DeleteFile(existingFile);
            mediaObject.UploadFileName = mediaFileName;
            await context.SaveChangesAsync();
            await CreateSnapshotAsync(mediaFile, Path.Combine(snapshotFolder, mediaObject.Snapshot));

            return mediaObject.Id;
        }

        var contentType = FsoService.GetMimeType(Path.GetExtension(mediaFile));
        var mediaAnalysis = await FFProbe.AnalyseAsync(mediaFile);
        mediaObject = new MediaObject
        {
            Id = Guid.NewGuid(),
            ContentType = contentType,
            Favorite = false,
            Hash = checksum,
            Width = mediaAnalysis.PrimaryVideoStream.Width,
            Height = mediaAnalysis.PrimaryVideoStream.Height,
            Duration = Convert.ToInt32(mediaAnalysis.PrimaryVideoStream?.Duration.TotalMilliseconds),
            OwnerId = userId,
            UploadFileName = Path.GetFileName(mediaFile)
        };

        context.Add(mediaObject);
        await context.SaveChangesAsync();
        await CreateSnapshotAsync(mediaFile, Path.Combine(snapshotFolder, mediaObject.Snapshot), mediaAnalysis);
        return mediaObject.Id;
    }

    private static async Task CreateSnapshotAsync(string mediaFile, string snapshotFile, IMediaAnalysis mediaAnalysis = null)
    {
        if (!File.Exists(mediaFile)) return;

        mediaAnalysis ??= await FFProbe.AnalyseAsync(mediaFile);
        await FFMpegArguments
            .FromFileInput(mediaFile)
            .OutputToFile(snapshotFile, true, options => options
                .Seek(TimeSpan.FromSeconds(mediaAnalysis.Duration.TotalSeconds / 4))
                .WithVideoFilters(filterOptions => filterOptions
                    .Scale(300, -1))
                .WithFrameOutputCount(1)
                .WithCustomArgument("-q:v 2")
            ).ProcessAsynchronously(false);
    }

    private static void DeleteFile(string fileName)
    {
        try
        {
            File.Delete(fileName);
        }
        catch (Exception e)
        {
            Debug.WriteLine(e.Message);
        }
    }

    private void ThrowException(int statusCode, string statusMessage)
    {
        var ex = new Exception(string.Format("{0} - {1}", statusMessage, statusCode.ToString()));
        ex.Data.Add(statusCode.ToString(), statusMessage);
        throw ex;
    }

    private string GetUserMediaFolder(Guid userId)
    {
        if (userId == Guid.Empty) return null;
        var mediaFolder = Path.Combine(_storageUrl, userId.ToString(), MediaDirName);
        if (!Directory.Exists(mediaFolder))
            Directory.CreateDirectory(mediaFolder);
        return mediaFolder;
    }

    private string GetUserSnapshotsFolder(Guid userId)
    {
        if (userId == Guid.Empty) return null;
        var snapshotFolder = Path.Combine(GetUserMediaFolder(userId), SnapshotsDirName);
        if (!Directory.Exists(snapshotFolder))
            Directory.CreateDirectory(snapshotFolder);
        return snapshotFolder;
    }

    public async Task UploadMediaFileAsync(IFormFile file, User user)
    {
        var mediaFolder = GetUserMediaFolder(user.Id);
        if (!Directory.Exists(mediaFolder))
            Directory.CreateDirectory(mediaFolder);
        var fileName = ContentDispositionHeaderValue.Parse(file.ContentDisposition).FileName.Trim('"');
        var mediaFile = Path.Combine(mediaFolder, fileName);
        if (File.Exists(mediaFile))
        {
            fileName = $"{Path.GetFileNameWithoutExtension(fileName)}_{Guid.NewGuid()}{Path.GetExtension(fileName)}";
            mediaFile = Path.Combine(mediaFolder, fileName);
        }
                
        using var stream = File.Create(mediaFile);
        await file.CopyToAsync(stream);
        stream.Close();
        await ProcessMediaFileAsync(mediaFile, user.Id);
    }

    public async Task CreateAlbumAsync(User user, string name)
    {
        if (user == null) return;
        var album = new MediaAlbum 
        {
            Id = Guid.NewGuid(),
            OwnerId = user.Id,
            Name = name,
            CreateDate = DateTime.UtcNow,
        };

        await context.MediaAlbums.AddAsync(album);
        await context.SaveChangesAsync();
    }

    public async Task<IEnumerable<MediaAlbum>> GetAllAlbumsAsync(User user)
    {
        if (user == null) return Enumerable.Empty<MediaAlbum>();
        var albums = await context.MediaAlbums
            .Where(x => x.OwnerId == user.Id)
            .OrderByDescending(x => x.LastUpdate)
            .ThenBy(x => x.Name)
            .ToListAsync();
        return albums;
    }

    public async Task AddMediaToAlbumAsync(User user, ICollection<Guid> mediaIds, ICollection<Guid> albumIds)
    {
        if (user == null || !mediaIds.Any() || !albumIds.Any()) return;
        if (albumIds is null)
        {
            throw new ArgumentNullException(nameof(albumIds));
        }

        var mediaObjects = await context.MediaObjects.Where(x => mediaIds.Contains(x.Id) && x.OwnerId == user.Id).ToListAsync();
        foreach (var albumId in albumIds)
        {
            var album = await context.MediaAlbums.Include(x => x.MediaObjects).Where(x => x.Id == albumId).FirstOrDefaultAsync();
            if (album == null || album.OwnerId != user.Id) continue;
            AddMediaToAlbum(album, mediaObjects);
        }

        await context.SaveChangesAsync();
    }

    private static void AddMediaToAlbum(MediaAlbum album, IEnumerable<MediaObject> mediaObjects)
    {
        foreach (var mediaObject in mediaObjects)
        {
            if (!album.MediaObjects.Contains(mediaObject))
                album.MediaObjects.Add(mediaObject);
        }
    }

    public async Task<bool> UniqueAlbumNameAsync(User user, string name)

    {
        if (name == null || user == null) return false;
        var exists = await context.MediaAlbums.AnyAsync(x => x.Name == name.Trim().ToLower() && x.OwnerId == user.Id);
        return !exists;
    }

    public async Task<IEnumerable<MediaObjectViewModel>> GetAlbumContentAsync(User user, string albumName)
    {
        var album = await context.MediaAlbums
            .AsNoTracking()
            .Include(x => x.MediaObjects.Where(m => !m.MarkedForDeletion))
            .Where(x => x.OwnerId == user.Id && x.Name == albumName).FirstOrDefaultAsync();
            
        if (album == null)
            ThrowException(404, "Album Not Found");

        var result = album.MediaObjects
            .AsParallel()
            .Where(x => x.OwnerId == user.Id)
            .Select(x => new MediaObjectViewModel(x))
            .ToList();

        return result;
    }

    public async Task<IEnumerable<Guid>> DeleteMediaObjectsAsync(User user, MediaObjectFilter filter, bool permanent)
    {
        var expression = filter.ToExpression().AndAlso(x => x.OwnerId == user.Id);
        var mediaObjects = await context.MediaObjects.Where(expression).ToListAsync();
        if (permanent)
        {
            var mediaFolder = GetUserMediaFolder(user.Id);
            foreach (var mediaObject in mediaObjects)
            {
                   
                var mediaFile = Path.Combine(mediaFolder, mediaObject.UploadFileName);
                DeleteFile(mediaFile);
            }

            context.MediaObjects.RemoveRange(mediaObjects);
        }
        else
        {
            foreach (var media in mediaObjects)
                media.MarkedForDeletion = true;
        }
                
        var result = mediaObjects.Select(x => x.Id);
        await context.SaveChangesAsync();
        return result;
    }

    public async Task<IEnumerable<Guid>> RestoreMediaObjectsAsync(User user, MediaObjectFilter filter)
    {
        var expression = filter.ToExpression().AndAlso(x => x.OwnerId == user.Id);
        var mediaObjects = await context.MediaObjects.Where(expression).ToListAsync();
        foreach (var mediaObject in mediaObjects)
            mediaObject.MarkedForDeletion = false;

        await context.SaveChangesAsync();
        return mediaObjects.Select(x => x.Id);
    }
}

public class Base64Image
{
    public string ContentType { get; set; }
    public byte[] FileContents { get; set; }
    public static Base64Image Parse(string base64Content)
    {
        if (string.IsNullOrEmpty(base64Content))
        {
            throw new ArgumentNullException(nameof(base64Content));
        }

        int indexOfSemiColon = base64Content.IndexOf(";", StringComparison.OrdinalIgnoreCase);

        string dataLabel = base64Content.Substring(0, indexOfSemiColon);

        string contentType = dataLabel.Split(':').Last();

        var startIndex = base64Content.IndexOf("base64,", StringComparison.OrdinalIgnoreCase) + 7;

        var fileContents = base64Content.Substring(startIndex);

        var bytes = Convert.FromBase64String(fileContents);

        return new Base64Image
        {
            ContentType = contentType,
            FileContents = bytes
        };
    }

    public override string ToString()
    {
        return $"data:{ContentType};base64,{Convert.ToBase64String(FileContents)}";
    }
}