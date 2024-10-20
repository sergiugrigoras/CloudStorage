using CloudStorage.Models;

namespace CloudStorage.Interfaces.Media;

public interface IMediaAlbumRepository : IRepository<MediaAlbum>
{
    Task<MediaAlbum> GetAlbumByNameAsync(string name, Guid userId, bool includeMediaObjects = false);
    Task<MediaAlbum> GetAlbumByIdAsync(Guid id, Guid userId, bool includeMediaObjects = false);

}