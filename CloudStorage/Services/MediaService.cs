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

namespace CloudStorage.Services
{
    public interface IMediaService 
    {
        Task<IEnumerable<MediaObjectViewModel>> GetAllMediFilesAsync(User user);
        Task<Stream> GetSnapshotAsync(User user, Guid mediaFileId);
        Task<Stream> GetMediaAsync(Guid id);
        Task<MediaObject> GetMediaObjectByIdAsync(Guid id);
        Task ParseMediaFolderAsync(User user);
        Task<bool> ToggleFavorite(Guid id);
        Task UploadMediaFileAsync(IFormFile file, User user);
    }
    public class MediaService: IMediaService
    {
        private readonly AppDbContext _context;
        private readonly string _storageUrl;
        private const string mediaDirName = "media";
        private const string snapshotsDirName = "snapshots";
        private const string snapshotExtension = ".jpg";
        private static IEnumerable<string> _mediaExtentions = new string[] { "jpg", "gif", "png", "mp4" };
        private static string _ffmpegTmpFolder = GlobalFFOptions.Current.TemporaryFilesFolder;
            public MediaService(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _storageUrl = configuration.GetValue<string>("Storage:url");
        }
        public async Task<IEnumerable<MediaObjectViewModel>> GetAllMediFilesAsync(User user)
        {
            return await _context.MediaObjects
                .Where(x => x.OwnerId == user.Id)
                .Select(x => new MediaObjectViewModel(x))
                .ToListAsync();
        }

        public async Task<Stream> GetSnapshotAsync(User user, Guid mediaFileId)
        {
            if (user == null) ThrowException(401, "Unauthorized.");
            var mediaObject = await _context.MediaObjects.FindAsync(mediaFileId);
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
            var mediaObject = await _context.MediaObjects.FindAsync(id);
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
            var mediaFolder = Path.Combine(_storageUrl, user.Id.ToString(), mediaDirName);
            var mediaFiles = Directory.EnumerateFiles(mediaFolder, "*.*", SearchOption.TopDirectoryOnly)
                    .Where(s => _mediaExtentions.Contains(Path.GetExtension(s).TrimStart('.').ToLowerInvariant()));
            if (!Directory.Exists(Path.Combine(mediaFolder, snapshotsDirName)))
                Directory.CreateDirectory(Path.Combine(mediaFolder, snapshotsDirName));
            ICollection<Guid> existingFilesMediaObjectIds = new List<Guid>();
            foreach (var file in mediaFiles)
            {
                var id = await ProcessMediaFileAsync(file, user.Id);
                existingFilesMediaObjectIds.Add(id);
            }

            var mediaObjectsNoFile = await _context.MediaObjects.Where(x => x.OwnerId == user.Id && !existingFilesMediaObjectIds.Contains(x.Id)).ToArrayAsync();
            if (mediaObjectsNoFile.Any())
            {
                var snapshotFolder = GetUserSnapshotsFolder(user.Id);
                foreach (var mediaObject in mediaObjectsNoFile)
                    DeleteFile(Path.Combine(snapshotFolder, mediaObject.Snapshot));

                _context.MediaObjects.RemoveRange(mediaObjectsNoFile);
                await _context.SaveChangesAsync();
            }
        }

        public async Task<bool> ToggleFavorite(Guid id)
        {
            var mediaObject = await _context.MediaObjects.FindAsync(id);
            if (mediaObject == null)
            {
                ThrowException(404, "Object not found.");
                return false;
            }
            mediaObject.Favorite = !mediaObject.Favorite;
            await _context.SaveChangesAsync();
            return mediaObject.Favorite;
        }

        private async Task<Guid> ProcessMediaFileAsync(string mediaFile, Guid userId)
        {
            var mediaFolder = GetUserMediaFolder(userId);
            var snapshotFolder = GetUserSnapshotsFolder(userId);
            var checksum = await CalculateMD5Async(mediaFile);
            var snapshotFile = Path.Combine(snapshotFolder, checksum + snapshotExtension);
            var mediaFileName = Path.GetFileName(mediaFile);

            MediaObject mediaObject;
            mediaObject = await _context.MediaObjects.FirstOrDefaultAsync(x => x.OwnerId == userId && x.Hash == checksum);
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
                await _context.SaveChangesAsync();
                await CreateSnapshotAsync(mediaFile, snapshotFile);

                return mediaObject.Id;
            }

            var contentType = FsoService.GetMimeType(Path.GetExtension(mediaFile));
            mediaObject = new MediaObject
            {
                Id = Guid.NewGuid(),
                ContentType = contentType,
                Favorite = false,
                Hash = checksum,
                OwnerId = userId,
                Snapshot = Path.GetFileName(snapshotFile),
                UploadFileName = Path.GetFileName(mediaFile)
            };

            _context.Add(mediaObject);
            await _context.SaveChangesAsync();
            await CreateSnapshotAsync(mediaFile, snapshotFile);
            return mediaObject.Id;
        }

        private static async Task CreateSnapshotAsync(string mediaFile, string snapshotFile)
        {
            if (!File.Exists(mediaFile)) return;
            var mediaInfo = await FFProbe.AnalyseAsync(mediaFile);

            await FFMpegArguments
            .FromFileInput(mediaFile)
            .OutputToFile(snapshotFile, true, options => options
                .Seek(TimeSpan.FromSeconds(mediaInfo.Duration.TotalSeconds / 4))
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
            return Path.Combine(_storageUrl, userId.ToString(), mediaDirName);
        }
        private string GetUserSnapshotsFolder(Guid userId)
        {
            if (userId == Guid.Empty) return null;
            return Path.Combine(GetUserMediaFolder(userId), snapshotsDirName);
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
}
