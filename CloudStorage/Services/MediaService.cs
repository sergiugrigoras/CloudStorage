using CloudStorage.Models;
using CloudStorage.ViewModels;
using FFMpegCore;
using FFMpegCore.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using System.Drawing;
using System.Security.Cryptography;

namespace CloudStorage.Services
{
    public interface IMediaService 
    {
        Task<IEnumerable<MediaObjectViewModel>> GetAllMediFilesAsync(User user);
        Task<Stream> GetSnapshotAsync(User user, Guid mediaFileId);
        Task<Stream> GetMediaAsync(Guid id);
        Task<MediaObject> GetMediaObjectByIdAsync(Guid id);
        Task ParseMediaFolderAsync(User user);
    }
    public class MediaService: IMediaService
    {
        private readonly AppDbContext _context;
        private readonly string _storageUrl;
        private const string mediaDirName = "media";
        private const string snapshotsDirName = "snapshots";
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
            if (!fileInfo.Exists) return null;
            return fileInfo.CreateReadStream();
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
            var mediaFolder = Path.Combine(_storageUrl, user.Id.ToString(), "media");
            var mediaFiles = Directory.EnumerateFiles(mediaFolder, "*.*", SearchOption.TopDirectoryOnly)
                    .Where(s => _mediaExtentions.Contains(Path.GetExtension(s).TrimStart('.').ToLowerInvariant()));
            if (!Directory.Exists(Path.Combine(mediaFolder, "snapshots")))
                Directory.CreateDirectory(Path.Combine(mediaFolder, "snapshots"));
            foreach (var file in mediaFiles)
            {
                try
                {
                    await ProcessMediaFileAsync(file, mediaFolder, user.Id);
                    Console.WriteLine($"Done - {file}");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Fail - {file}");
                }
            }
        }

        private async Task ProcessMediaFileAsync(string mediaFile, string mediaFolder, Guid userId)
        {
            var checksum = await CalculateMD5Async(mediaFile);
            var exists = await _context.MediaObjects.Where(x => x.OwnerId == userId && x.Hash == checksum).Select(x => x.Id).FirstOrDefaultAsync();
            if (exists != Guid.Empty) return;
            var snapshotDir = Path.Combine(mediaFolder, "snapshots");
            var snapshotFile = Path.Combine(snapshotDir, checksum + ".png");
            var mediaInfo = await FFProbe.AnalyseAsync(mediaFile);
            FFMpeg.Snapshot(mediaFile, snapshotFile, new Size(300, -1), TimeSpan.FromSeconds(mediaInfo.Duration.TotalSeconds / 4));
            var contentType = FsoService.GetMimeType(Path.GetExtension(mediaFile));

            var mediaObject = new MediaObject
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
