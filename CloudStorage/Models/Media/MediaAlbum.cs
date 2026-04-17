using CloudStorage.ViewModels;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace CloudStorage.Models.Media;

public class MediaAlbum
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; }
    public string Name { get; set; }
    
    [BsonRepresentation(BsonType.ObjectId)]
    public string UserId { get; set; }
    public DateTime CreateDate { get; set; }
    public DateTime? LastUpdate { get; set; }
    [BsonRepresentation(BsonType.ObjectId)]
    public List<string> MediaEntries { get; set; } = [];
}

public class MediaAlbumViewModel
{
    public string Id { get; set; }
    public string Name { get; set; }
    public DateTime CreateDate { get; set; }
    public DateTime? LastUpdate { get; set; }
    public ICollection<MediaEntryViewModel> MediaEntries { get; set; } = new List<MediaEntryViewModel>();
    
    public static MediaAlbumViewModel FromDomain(MediaAlbum domain)
    {
        return new MediaAlbumViewModel
        {
            Id = domain.Id,
            Name = domain.Name,
            CreateDate = domain.CreateDate,
            LastUpdate = domain.LastUpdate,
        };
    }
}