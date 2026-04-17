using CloudStorage.Models;
using CloudStorage.Services;
using MongoDB.Driver;

namespace CloudStorage.Repositories.User;

public interface IInviteRepository
{
    Task CreateAsync(Invite invite);
    Task<Invite> GetOneByEmailAsync(string email);
    Task UpdateCodeAsync(string email, string codeHash);
    Task UpdateDateAsync(string email, DateTime date);
}

public class InviteRepository(IMongoDatabase db) : IInviteRepository
{
    private readonly IMongoCollection<Invite> _collection = 
        db.GetCollection<Invite>(MongoDbCollections.InviteCodes);
    
    public Task CreateAsync(Invite invite) => _collection.InsertOneAsync(invite);

    public Task<Invite> GetOneByEmailAsync(string email)
    {
        var options = new FindOptions
        {
            Collation = new Collation("en", strength: CollationStrength.Secondary)
        };
        return _collection.Find(Builders<Invite>.Filter.Eq(x => x.Email, email), options).FirstOrDefaultAsync();
    }

    public Task UpdateCodeAsync(string email, string codeHash)
    {
        var emailFilter = Builders<Invite>.Filter.Eq(x => x.Email, email);
        var update = Builders<Invite>.Update.Set(x => x.CodeHash, codeHash);
        
        return _collection.UpdateOneAsync(emailFilter, update,
            new UpdateOptions { Collation = new Collation("en", strength: CollationStrength.Secondary) });
    }

    public Task UpdateDateAsync(string email, DateTime date)
    {
        var emailFilter = Builders<Invite>.Filter.Eq(x => x.Email, email);
        var update = Builders<Invite>.Update.Set(x => x.Date, date);
        
        return _collection.UpdateOneAsync(emailFilter, update,
            new UpdateOptions { Collation = new Collation("en", strength: CollationStrength.Secondary) });
    }
}