using CloudStorage.Services;
using MongoDB.Bson;
using MongoDB.Driver;

namespace CloudStorage.Repositories.Note;

public interface INoteRepository
{
    Task<List<Models.Note>> GetUserNotesAsync(Guid userId);
    Task CreateAsync(Models.Note note, Guid userId);
    Task<Models.Note> UpdateAsync(Models.Note note, Guid userId);
    Task<Models.Note> DeleteAsync(ObjectId id, Guid userId);
}

public class NoteRepository(IMongoDatabase db) : INoteRepository
{
    private readonly IMongoCollection<Models.Note> _collection = db.GetCollection<Models.Note>(MongoDbCollections.Notes);
    
    public Task<List<Models.Note>> GetUserNotesAsync(Guid userId) => _collection.Find(x => x.UserId == userId).ToListAsync();

    public Task CreateAsync(Models.Note note, Guid userId)
    { 
        note.UserId = userId;
        note.CreationDate = DateTime.UtcNow;
        return _collection.InsertOneAsync(note);
    }
    
    public Task<Models.Note> UpdateAsync(Models.Note note, Guid userId)
    {
        var update = Builders<Models.Note>.Update
            .Set(n => n.Title, note.Title)
            .Set(n => n.Text, note.Text)
            .Set(n => n.Checklist, note.Checklist)
            .Set(n => n.ModificationDate, DateTime.UtcNow);

        var option = new FindOneAndUpdateOptions<Models.Note> { ReturnDocument = ReturnDocument.After };
        return _collection.FindOneAndUpdateAsync(BuildUserAndIdFilter(userId, note.Id), update, option);
    }

    public Task<Models.Note> DeleteAsync(ObjectId id, Guid userId) =>
        _collection.FindOneAndDeleteAsync(BuildUserAndIdFilter(userId, id));
    
    private static FilterDefinition<Models.Note> BuildUserAndIdFilter(Guid userId, ObjectId id)
    {
        var idFilter = Builders<Models.Note>.Filter.Eq(x => x.Id, id);
        var userFilter = Builders<Models.Note>.Filter.Eq(x => x.UserId, userId);
        return Builders<Models.Note>.Filter.And(idFilter, userFilter);
    }
}