using CloudStorage.Models;

namespace CloudStorage.ViewModels
{
    public class MediaObjectViewModel
    {
        public MediaObjectViewModel(MediaObject mediaObject)
        {
            Id = mediaObject.Id;
            UploadFileName = mediaObject.UploadFileName;
            ContentType = mediaObject.ContentType;
            Hash = mediaObject.Hash;
            Snapshot = mediaObject.Snapshot;
            Favorite = mediaObject.Favorite;
            OwnerId = mediaObject.OwnerId;
        }

        public MediaObjectViewModel() { }
        public Guid Id { get; set; }

        public string UploadFileName { get; set; }

        public string ContentType { get; set; }

        public string Hash { get; set; }

        public string Snapshot { get; set; }

        public bool Favorite { get; set; }

        public Guid OwnerId { get; set; }
    }
}
