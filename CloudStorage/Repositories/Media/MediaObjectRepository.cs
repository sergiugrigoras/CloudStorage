using CloudStorage.Interfaces.Media;
using CloudStorage.Models;

namespace CloudStorage.Repositories.Media;

public class MediaObjectRepository(AppDbContext context) : Repository<MediaObject>(context), IMediaObjectRepository
{
    
}