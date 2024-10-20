namespace CloudStorage.Interfaces.Media;

public interface IMediaUnitOfWork : IUnitOfWork
{
    IMediaObjectRepository MediaObjects { get; }
    IMediaAlbumRepository MediaAlbums { get; }
}