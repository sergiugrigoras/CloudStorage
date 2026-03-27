#nullable enable
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace CloudStorage.Models.Media;

public class MediaEntry
{
    [BsonId]
    public ObjectId Id { get; set; }
    public string UploadFileName { get; set; }
    public string ContentType { get; set; }
    public string Hash { get; set; }
    public int? Width { get; set; }
    public int? Height { get; set; }
    public int? Duration { get; set; }
    public long? FileSize { get; set; }
    public bool Favorite { get; set; }
    public bool MarkedForDeletion { get; set; }
    [BsonRepresentation(BsonType.String)]
    public Guid UserId { get; set; }
    [BsonIgnore]
    public string SnapshotFile => Hash + ".jpg";
    [BsonIgnore]
    public string MediaFile => Hash;
}

public class MediaEntryViewModel
{
    public string Id { get; set; }
    public string UploadFileName { get; set; }
    public string ContentType { get; set; }
    public string Hash { get; set; }
    public int? Width { get; set; }
    public int? Height { get; set; }
    public int? Duration { get; set; }
    public bool Favorite { get; set; }
    public bool MarkedForDeletion { get; set; }

    public static MediaEntryViewModel FromDomain(MediaEntry domain)
    {
        return new MediaEntryViewModel
        {
            Id = domain.Id.ToString(),
            UploadFileName = domain.UploadFileName,
            ContentType = domain.ContentType,
            Hash = domain.Hash,
            Width = domain.Width,
            Height = domain.Height,
            Duration = domain.Duration,
            Favorite = domain.Favorite,
            MarkedForDeletion = domain.MarkedForDeletion
        };
    }
}

public class MediaEntryQuery
{
    public bool? Favorite { get; set; }
    public bool? Deleted { get; set; }
    public IEnumerable<string>? Ids { get; set; }
}

public record MediaFileResult(Stream Stream, string ContentType);

public sealed class PendingMediaFile
{
    public string OriginalFileName { get; set; }
    public string FullPath { get; set; }
    public long FileSize { get; set; }
    public string Hash { get; set; }
}