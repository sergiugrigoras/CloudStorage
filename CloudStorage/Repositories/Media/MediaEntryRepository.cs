using CloudStorage.Models.Media;
using CloudStorage.Services;
using MongoDB.Bson;
using MongoDB.Driver;

namespace CloudStorage.Repositories.Media;

public interface IMediaEntrySystemRepository
{
    Task<MediaEntry> GetOneAsync(string id);
}

public class MediaEntrySystemRepository(IMongoDatabase db) : IMediaEntrySystemRepository
{
    private readonly IMongoCollection<MediaEntry> _collection = 
        db.GetCollection<MediaEntry>(MongoDbCollections.MediaEntries);

    public Task<MediaEntry> GetOneAsync(string id) =>
        _collection.Find(Builders<MediaEntry>.Filter.Eq(x => x.Id, id)).FirstOrDefaultAsync();
}

public interface IMediaEntryRepository
{
    Task<MediaEntry> GetOneAsync(string id, string userId);

    Task<List<MediaEntry>> SearchAsync(
        bool? favorite,
        bool? deleted,
        IEnumerable<string> ids,
        string userId
    );
    
    Task<MediaEntry?> GetByHashAsync(string hash, string userId);
    
    Task<long?> GetFilesSizeAsync(string userId);
    
    Task<MediaEntry> UpdateAsync(MediaEntry entry, string userId);

    Task<MediaEntry> SetFavoriteAsync(string id, string userId, bool favorite);
    Task SetDeletedAsync(IEnumerable<string> ids, string userId, bool deleted);
    
    Task CreateAsync(MediaEntry entry, string userId);
    
    Task DeleteManyAsync(IEnumerable<string> ids, string userId);
}

public class MediaEntryRepository(IMongoDatabase db) : IMediaEntryRepository
{
    private readonly IMongoCollection<MediaEntry> _collection = db.GetCollection<MediaEntry>(MongoDbCollections.MediaEntries);
    
    public Task<MediaEntry> GetOneAsync(string id, string userId)
    {
        var userFilter = Builders<MediaEntry>.Filter.Eq(x => x.UserId, userId);
        var idFilter = Builders<MediaEntry>.Filter.Eq(x => x.Id, id);
        return _collection.Find(Builders<MediaEntry>.Filter.And(userFilter, idFilter)).FirstOrDefaultAsync();
    }
    
    public Task<List<MediaEntry>> SearchAsync(
        bool? favorite,
        bool? deleted,
        IEnumerable<string> ids,
        string userId
    )
    {
        var filters = new List<FilterDefinition<MediaEntry>>
        {
            Builders<MediaEntry>.Filter.Eq(x => x.UserId, userId)
        };

        if (favorite.HasValue)
            filters.Add(Builders<MediaEntry>.Filter.Eq(x => x.Favorite, favorite.Value));

        if (deleted.HasValue)
            filters.Add(Builders<MediaEntry>.Filter.Eq(x => x.MarkedForDeletion, deleted.Value));

        if (ids != null)
            filters.Add(Builders<MediaEntry>.Filter.In(x => x.Id, ids));

        return _collection.Find(Builders<MediaEntry>.Filter.And(filters)).ToListAsync();
    }

    public async Task<MediaEntry> GetByHashAsync(string hash, string userId)
    {
        var userFilter = Builders<MediaEntry>.Filter.Eq(x => x.UserId, userId);
        var hashFilter = Builders<MediaEntry>.Filter.Eq(x => x.Hash, hash);
        return await _collection.Find(Builders<MediaEntry>.Filter.And(userFilter, hashFilter)).FirstOrDefaultAsync();
    }

    public Task<long?> GetFilesSizeAsync(string userId) =>
        _collection
            .Aggregate()
            .Match(Builders<MediaEntry>.Filter.Eq(x => x.UserId, userId))
            .Group(x => 1, g => g.Sum(x => x.FileSize))
            .FirstOrDefaultAsync();

    public Task<MediaEntry> UpdateAsync(MediaEntry entry, string userId)
    {
        var userFilter = Builders<MediaEntry>.Filter.Eq(x => x.UserId, userId);
        var idFilter = Builders<MediaEntry>.Filter.Eq(x => x.Id, entry.Id);

        var update = Builders<MediaEntry>.Update
            .Set(x => x.ContentType, entry.ContentType)
            .Set(x => x.Hash, entry.Hash)
            .Set(x => x.Width, entry.Width)
            .Set(x => x.Height, entry.Height)
            .Set(x => x.Duration, entry.Duration)
            .Set(x => x.UploadFileName, entry.UploadFileName)
            .Set(x => x.MarkedForDeletion, entry.MarkedForDeletion)
            .Set(x => x.FileSize, entry.FileSize);
            
        var option = new FindOneAndUpdateOptions<MediaEntry> { ReturnDocument = ReturnDocument.After };
        
        return _collection.FindOneAndUpdateAsync(Builders<MediaEntry>.Filter.And(userFilter, idFilter), update, option);
    }

    public Task<MediaEntry> SetFavoriteAsync(string id, string userId, bool favorite)
    {
        var filter = Builders<MediaEntry>.Filter.And(
            Builders<MediaEntry>.Filter.Eq(x => x.Id, id),
            Builders<MediaEntry>.Filter.Eq(x => x.UserId, userId)
        );

        var update = Builders<MediaEntry>.Update
            .Set(x => x.Favorite, favorite);

        var options = new FindOneAndUpdateOptions<MediaEntry>
        {
            ReturnDocument = ReturnDocument.After
        };

        return _collection.FindOneAndUpdateAsync(filter, update, options);
    }

    public Task SetDeletedAsync(IEnumerable<string> ids, string userId, bool deleted)
    {
        var filter = Builders<MediaEntry>.Filter.And(
            Builders<MediaEntry>.Filter.In(x => x.Id, ids),
            Builders<MediaEntry>.Filter.Eq(x => x.UserId, userId)
        );

        var update = Builders<MediaEntry>.Update
            .Set(x => x.MarkedForDeletion, deleted);
        
        return _collection.UpdateManyAsync(filter, update);
    }

    public Task CreateAsync(MediaEntry entry, string userId)
    {
        entry.UserId = userId;
        return _collection.InsertOneAsync(entry);
    }

    public Task DeleteManyAsync(IEnumerable<string> ids, string userId)
    {
        var filter = Builders<MediaEntry>.Filter.And(
            Builders<MediaEntry>.Filter.In(x => x.Id, ids),
            Builders<MediaEntry>.Filter.Eq(x => x.UserId, userId)
        );

        return _collection.DeleteManyAsync(filter);
    }
}