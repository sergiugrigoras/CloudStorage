namespace CloudStorage.ViewModels
{
    public class MediaToAlbumViewModel
    {
        public ICollection<Guid> AlbumsIds { get; set; }
        public ICollection<Guid> MediaObjectsIds { get; set; }
        public MediaToAlbumViewModel()
        {

        }
    }
}
