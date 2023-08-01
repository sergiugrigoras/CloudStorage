using CloudStorage.Models;

namespace CloudStorage.ViewModels
{
    public class MediaAlbumViewModel
    {
        public Guid Id { get; set; }

        public string Name { get; set; }

        public Guid? OwnerId { get; set; }

        public DateTime CreateDate { get; set; }

        public DateTime? LastUpdate { get; set; }

        public string OwnerName { get; set; }

        public ICollection<MediaObjectViewModel> MediaObjects { get; set; } = new List<MediaObjectViewModel>();

        public MediaAlbumViewModel()
        {
            
        }
        public MediaAlbumViewModel(MediaAlbum mediaAlbum)
        {
            Id = mediaAlbum.Id;
            Name = mediaAlbum.Name;
            OwnerId = mediaAlbum.OwnerId;
            CreateDate = mediaAlbum.CreateDate;
            LastUpdate = mediaAlbum.LastUpdate;
            OwnerName = mediaAlbum.Owner?.Username ?? string.Empty;
            if (mediaAlbum.MediaObjects.Any())
            {
                MediaObjects = mediaAlbum.MediaObjects.Select(x => new MediaObjectViewModel(x)).ToList();
            }
        }
    }
}
