using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace CloudStorage.Models;

public class Invite
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; }
    public string CodeHash { get; set; }
    public string Email { get; set; }
    public DateTime? Date { get; set; }
}