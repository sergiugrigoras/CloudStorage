using System.Linq.Expressions;
using CloudStorage.Interfaces.Media;
using CloudStorage.Models;
using Microsoft.EntityFrameworkCore;

namespace CloudStorage.Repositories.Media;

public class MediaAlbumRepository(AppDbContext context) : Repository<MediaAlbum>(context), IMediaAlbumRepository
{
    public Task<MediaAlbum> GetAlbumByNameAsync(string name, Guid userId, bool includeMediaObjects = false)
    {
        return GetAlbumAsync(x => x.Name == name, userId, includeMediaObjects);
    }

    public Task<MediaAlbum> GetAlbumByIdAsync(Guid id, Guid userId, bool includeMediaObjects = false)
    {
        return GetAlbumAsync(x => x.Id == id, userId, includeMediaObjects);
    }
    
    private Task<MediaAlbum> GetAlbumAsync(Expression<Func<MediaAlbum, bool>> predicate, Guid userId, bool includeMediaObjects)
    {
        var query = Context.MediaAlbums.AsQueryable();
        
        query = query.Where(predicate).Where(x => x.OwnerId == userId);
        
        if (includeMediaObjects)
        {
            query = query.Include(x => x.MediaObjects);
        }
        
        return query.FirstOrDefaultAsync();
    }
}