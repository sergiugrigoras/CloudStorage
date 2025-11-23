using CloudStorage.Interfaces.Notes;
using CloudStorage.Models;
using MongoDB.Driver;

namespace CloudStorage.Repositories.Notes;

public class NotesRepository(IMongoDatabase db) : INotesRepository
{
    private const string CollectionName = "notes";
    private readonly IMongoCollection<Note> _collection = db.GetCollection<Note>(CollectionName);
    
    public Task<Note> GetAsync(string id) => _collection.Find(x => x.Id == id).FirstOrDefaultAsync();
    public Task<List<Note>> GetUserNotesAsync(Guid userId) => _collection.Find(x => x.UserId == userId).ToListAsync();
    public Task CreateAsync(Note note) => _collection.InsertOneAsync(note);
    public Task ReplaceAsync(Note note) => _collection.ReplaceOneAsync(x => x.Id == note.Id, note);
    public Task<Note> UpdateAsync(NoteInputModel input, Guid userId)
    {
        var idFilter = Builders<Note>.Filter.Eq(x => x.Id, input.Id);
        var userFilter = Builders<Note>.Filter.Eq(x => x.UserId, userId);
        var filter = Builders<Note>.Filter.And(idFilter, userFilter);

        var update = Builders<Note>.Update
            .Set(n => n.Title, input.Title)
            .Set(n => n.Text, input.Text)
            .Set(n => n.Checklist, input.Checklist)
            .Set(n => n.ModificationDate, DateTime.UtcNow);

        var option = new FindOneAndUpdateOptions<Note> { ReturnDocument = ReturnDocument.After };
        return _collection.FindOneAndUpdateAsync(filter, update, option);
    }

    public Task<Note> DeleteAsync(string id, Guid userId)
    {
        var idFilter = Builders<Note>.Filter.Eq(x => x.Id, id);
        var userFilter = Builders<Note>.Filter.Eq(x => x.UserId, userId);
        var filter = Builders<Note>.Filter.And(idFilter, userFilter);
        return _collection.FindOneAndDeleteAsync(filter);
    }
}