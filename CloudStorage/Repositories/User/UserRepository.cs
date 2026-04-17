using CloudStorage.Models;
using CloudStorage.Services;
using MongoDB.Bson;
using MongoDB.Driver;

namespace CloudStorage.Repositories.User;

public interface IUserRepository
{
    Task CreateAsync(Models.User user);
    Task<Models.User> GetOneByIdAsync(string id);
    Task<Models.User> GetOneByEmailAsync(string email);
    Task<Models.User> UpdateRefreshTokenAsync(string userId, string refreshToken, DateTime? expiryTime);
    Task UpdateLastActiveAsync(string userId, DateTime date);
    Task<Models.User> UpdatePasswordAndResetTokenAsync(string userId, string newPasswordHash);
    Task<Models.User> UpdateTotpSecretAsync(string userId, string totpSecret);
    Task<Models.User> UpdateTwoFaAsync(string userId, bool twoFaEnabled);
    Task UpdatePasswordResetTokenAsync(string email, PendingResetToken resetToken);
    Task<Models.User> UpdateDisabledAsync(string userId, bool disabled);
    Task<List<Models.User>> GetUserListAsync();
}

public class UserRepository(IMongoDatabase db) : IUserRepository
{
    private readonly IMongoCollection<Models.User> _collection = 
        db.GetCollection<Models.User>(MongoDbCollections.Users);

    public Task CreateAsync(Models.User user) => _collection.InsertOneAsync(user);

    public Task<Models.User> GetOneByIdAsync(string id) =>
        _collection.Find(Builders<Models.User>.Filter.Eq(x => x.Id, id)).FirstOrDefaultAsync();

    public Task<Models.User> GetOneByEmailAsync(string email)
    {
        var options = new FindOptions
        {
            Collation = new Collation("en", strength: CollationStrength.Secondary)
        };
        return _collection.Find(Builders<Models.User>.Filter.Eq(x => x.Email, email), options).FirstOrDefaultAsync();
    }

    public Task<Models.User> UpdateRefreshTokenAsync(string userId, string refreshToken, DateTime? expiryTime)
    {
        var idFilter = Builders<Models.User>.Filter.Eq(x => x.Id, userId);
        var update = Builders<Models.User>.Update
            .Set(x => x.RefreshToken, refreshToken)
            .Set(x => x.RefreshTokenExpiryTime, expiryTime);
        
        var option = new FindOneAndUpdateOptions<Models.User> { ReturnDocument = ReturnDocument.After };
        
        return _collection.FindOneAndUpdateAsync(idFilter, update, option);
    }

    public Task UpdateLastActiveAsync(string userId, DateTime date)
    {
        var filter = Builders<Models.User>.Filter.Eq(x => x.Id, userId);
        var update = Builders<Models.User>.Update.Set(x => x.LastActive, date);

        return _collection.UpdateOneAsync(filter, update);
    }

    public Task<Models.User> UpdatePasswordAndResetTokenAsync(string userId, string newPasswordHash)
    {
        var idFilter = Builders<Models.User>.Filter.Eq(x => x.Id, userId);
        var update = Builders<Models.User>.Update
            .Set(x => x.PasswordHash, newPasswordHash)
            .Set(x => x.PasswordResetToken, null);
        
        var option = new FindOneAndUpdateOptions<Models.User> { ReturnDocument = ReturnDocument.After };
        
        return _collection.FindOneAndUpdateAsync(idFilter, update, option);
    }

    public Task<Models.User> UpdateTotpSecretAsync(string userId, string totpSecret)
    {
        var idFilter = Builders<Models.User>.Filter.Eq(x => x.Id, userId);
        var update = Builders<Models.User>.Update
            .Set(x => x.TotpSecret, totpSecret);
        
        var option = new FindOneAndUpdateOptions<Models.User> { ReturnDocument = ReturnDocument.After };
        
        return _collection.FindOneAndUpdateAsync(idFilter, update, option);
    }

    public Task<Models.User> UpdateTwoFaAsync(string userId, bool twoFaEnabled)
    {
        var idFilter = Builders<Models.User>.Filter.Eq(x => x.Id, userId);
        var update = Builders<Models.User>.Update
            .Set(x => x.TwoFaEnabled, twoFaEnabled);
        
        var option = new FindOneAndUpdateOptions<Models.User> { ReturnDocument = ReturnDocument.After };
        
        return _collection.FindOneAndUpdateAsync(idFilter, update, option);
    }

    public Task UpdatePasswordResetTokenAsync(string email, PendingResetToken resetToken)
    {
       var activeUserFilter =  Builders<Models.User>.Filter.Eq(x => x.Disabled, false);
       var emailFilter = Builders<Models.User>.Filter.Eq(x => x.Email, email);
       var filter =  Builders<Models.User>.Filter.And(activeUserFilter, emailFilter);
       
       var update = Builders<Models.User>.Update.Set(x => x.PasswordResetToken, resetToken);

       return _collection.UpdateOneAsync(filter, update,
           new UpdateOptions { Collation = new Collation("en", strength: CollationStrength.Secondary) });
    }

    public Task<Models.User> UpdateDisabledAsync(string userId, bool disabled)
    {
        var idFilter = Builders<Models.User>.Filter.Eq(x => x.Id, userId);
        var update = Builders<Models.User>.Update
            .Set(x => x.Disabled, disabled);
        var option = new FindOneAndUpdateOptions<Models.User> { ReturnDocument = ReturnDocument.After };
        
        return _collection.FindOneAndUpdateAsync(idFilter, update, option);
    }

    public Task<List<Models.User>> GetUserListAsync() =>
        _collection.Find(Builders<Models.User>.Filter.Empty).ToListAsync();
}