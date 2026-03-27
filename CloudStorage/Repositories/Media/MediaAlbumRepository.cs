using CloudStorage.Models.Media;
using CloudStorage.Services;
using MongoDB.Bson;
using MongoDB.Driver;

namespace CloudStorage.Repositories.Media;

public interface IMediaAlbumRepository
{
    Task<List<MediaAlbum>> GetAlbumsAsync(Guid userId);
    Task<MediaAlbum> GetAlbumByNameAsync(string name, Guid userId);
    Task<bool> ExistsAsync(string name, Guid userId);
    Task CreateAsync(MediaAlbum album, Guid userId);
    Task<MediaAlbum> UpdateAsync(MediaAlbum album, Guid userId);
    Task PullMediaEntriesAsync(IEnumerable<ObjectId> mediaEntryIds, Guid userId);

    Task<UpdateResult> AddMediaEntriesToAlbumsAsync(IEnumerable<ObjectId> mediaEntryIds, IEnumerable<ObjectId> albumIds, Guid userId);
}

public class MediaAlbumRepository(IMongoDatabase db): IMediaAlbumRepository
{
    private readonly IMongoCollection<MediaAlbum> _collection = db.GetCollection<MediaAlbum>(MongoDbCollections.MediaAlbums);

    public Task<List<MediaAlbum>> GetAlbumsAsync(Guid userId)
    {
        var userFilter = Builders<MediaAlbum>.Filter.Eq(x => x.UserId, userId);
        return _collection.Find(userFilter).ToListAsync();
    }

    public Task<MediaAlbum> GetAlbumByNameAsync(string name, Guid userId)
    {
        var userFilter = Builders<MediaAlbum>.Filter.Eq(x => x.UserId, userId);
        var nameFilter = Builders<MediaAlbum>.Filter.Eq(x => x.Name, name);
        return _collection.Find(Builders<MediaAlbum>.Filter.And(userFilter, nameFilter)).FirstOrDefaultAsync();
    }

    public Task<bool> ExistsAsync(string name, Guid userId)
    {
        var userFilter = Builders<MediaAlbum>.Filter.Eq(x => x.UserId, userId);
        var nameFilter = Builders<MediaAlbum>.Filter.Eq(x => x.Name, name);
        return _collection.Find(Builders<MediaAlbum>.Filter.And(userFilter, nameFilter)).AnyAsync();
    }

    public Task CreateAsync(MediaAlbum album, Guid userId)
    {
        album.UserId = userId;
        album.CreateDate = DateTime.UtcNow;
        return _collection.InsertOneAsync(album);
    }

    public Task<MediaAlbum> UpdateAsync(MediaAlbum album, Guid userId)
    {
        var userFilter = Builders<MediaAlbum>.Filter.Eq(x => x.UserId, userId);
        var idFilter = Builders<MediaAlbum>.Filter.Eq(x => x.Id, album.Id);
        
        var update = Builders<MediaAlbum>.Update
            .Set(x => x.Name, album.Name)
            .Set(x => x.LastUpdate, DateTime.UtcNow);
        
        var option = new FindOneAndUpdateOptions<MediaAlbum> { ReturnDocument = ReturnDocument.After };
        
        return _collection.FindOneAndUpdateAsync(Builders<MediaAlbum>.Filter.And(userFilter, idFilter), update, option);
    }

    public Task PullMediaEntriesAsync(IEnumerable<ObjectId> mediaEntryIds, Guid userId)
    {
        var idList = mediaEntryIds.ToList();
        var filter = Builders<MediaAlbum>.Filter.And(
            Builders<MediaAlbum>.Filter.Eq(x => x.UserId, userId),
            Builders<MediaAlbum>.Filter.AnyIn(x => x.MediaEntries, idList)
        );
        var update = Builders<MediaAlbum>.Update.PullAll(x => x.MediaEntries, idList);
        return _collection.UpdateManyAsync(filter, update);
    }

    public Task<UpdateResult> AddMediaEntriesToAlbumsAsync(
        IEnumerable<ObjectId> mediaEntryIds,
        IEnumerable<ObjectId> albumIds,
        Guid userId)
    {
        var filter = Builders<MediaAlbum>.Filter.And(
            Builders<MediaAlbum>.Filter.Eq(x => x.UserId, userId),
            Builders<MediaAlbum>.Filter.In(x => x.Id, albumIds)
        );

        var update = Builders<MediaAlbum>.Update
            .AddToSetEach(x => x.MediaEntries, mediaEntryIds);

        return _collection.UpdateManyAsync(filter, update);
    }
}