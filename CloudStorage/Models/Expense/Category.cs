using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace CloudStorage.Models.Expense;

public class Category
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; }
    
    public string Name { get; set; }
    public string Emoji { get; set; }
    
    [BsonRepresentation(BsonType.ObjectId)]
    public string UserId { get; set; }
}

public class CategoryViewModel
{
    
    public static CategoryViewModel FromDomain(Category category)
    {
        if (category == null) return null;
        return new CategoryViewModel
        {
            Id = category.Id,
            Name = category.Name,
            Emoji = category.Emoji,
        };
    }
    
    public string Id { get; set; }
    public string Name { get; set; }
    public string Emoji { get; set; }
    
}