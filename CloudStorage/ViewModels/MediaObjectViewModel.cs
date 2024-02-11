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
            Width = mediaObject.Width;
            Height = mediaObject.Height;
            Duration = mediaObject.Duration;
            Favorite = mediaObject.Favorite;
            OwnerId = mediaObject.OwnerId;
            MarkedForDeletion = mediaObject.MarkedForDeletion;
        }

        public MediaObjectViewModel() { }
        public Guid Id { get; set; }

        public string UploadFileName { get; set; }

        public string ContentType { get; set; }

        public string Hash { get; set; }

        public int? Width { get; set; }

        public int? Height { get; set; }

        public int? Duration { get; set; }

        public bool Favorite { get; set; }
        public bool MarkedForDeletion { get; set; }

        public Guid OwnerId { get; set; }
    }
}
