using CloudStorage.Models;
using CloudStorage.ViewModels;

namespace CloudStorage.Interfaces.Media;

public interface IMediaService
{
    Task<IEnumerable<MediaObject>> GetMediaObjectsAsync(MediaObjectFilter filter);
    Task<MediaObject> GetMediaObjectByIdAsync(Guid id);
    Task<Stream> GetSnapshotStreamAsync(Guid id);
    Task<Stream> GetMediaStreamAsync(Guid id);
    
    Task<bool?> ToggleFavorite(Guid id);
    Task UploadMediaFilesAsync(IEnumerable<IFormFile> files, Guid userId);
    Task CreateAlbumAsync(Guid userId, string name);
    Task<IEnumerable<MediaAlbum>> GetAllUserAlbumsAsync(Guid userId);
    Task AddMediaToAlbumAsync(Guid userId, IEnumerable<Guid> mediaIds, IEnumerable<Guid> albumIds);
    Task<bool> UniqueAlbumNameAsync(Guid userId, string name);
    Task<IEnumerable<MediaObject>> GetAlbumContentAsync(Guid userId, string albumName);
    Task DeleteMediaObjectsAsync(Guid userId, MediaObjectFilter filter, bool permanent);
    Task RestoreMediaObjectsAsync(MediaObjectFilter filter);
}