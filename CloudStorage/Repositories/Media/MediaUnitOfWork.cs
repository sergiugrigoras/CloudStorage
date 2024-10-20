using CloudStorage.Interfaces.Media;
using CloudStorage.Models;

namespace CloudStorage.Repositories.Media;

public class MediaUnitOfWork(AppDbContext context, IMediaObjectRepository mediaObjectRepository, IMediaAlbumRepository mediaAlbumRepository) : UnitOfWork(context), IMediaUnitOfWork
{
    public IMediaObjectRepository MediaObjects { get; } = mediaObjectRepository;
    public IMediaAlbumRepository MediaAlbums { get; } = mediaAlbumRepository;
}