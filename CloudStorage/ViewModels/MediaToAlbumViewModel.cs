namespace CloudStorage.ViewModels
{
    public class MediaToAlbumViewModel
    {
        public IEnumerable<Guid> AlbumsIds { get; set; }
        public IEnumerable<Guid> MediaObjectsIds { get; set; }
        public MediaToAlbumViewModel()
        {

        }
    }
}
