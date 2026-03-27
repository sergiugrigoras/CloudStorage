using CloudStorage.ViewModels;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace CloudStorage.Models.Media;

public class MediaAlbum
{
    [BsonId]
    public ObjectId Id { get; set; }
    public string Name { get; set; }
    [BsonRepresentation(BsonType.String)]
    public Guid UserId { get; set; }
    public DateTime CreateDate { get; set; }
    public DateTime? LastUpdate { get; set; }
    public List<ObjectId> MediaEntries { get; set; } = [];
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
            Id = domain.Id.ToString(),
            Name = domain.Name,
            CreateDate = domain.CreateDate,
            LastUpdate = domain.LastUpdate,
        };
    }
}