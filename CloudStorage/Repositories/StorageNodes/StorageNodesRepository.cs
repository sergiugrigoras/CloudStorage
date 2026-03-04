using System.Linq.Expressions;
using CloudStorage.Models;
using CloudStorage.Services;
using MongoDB.Bson;
using MongoDB.Driver;

namespace CloudStorage.Repositories.StorageNodes;

public interface IStorageNodeRepository
{
    Task<StorageNode> GetOneAsync(FilterDefinition<StorageNode> filter, Guid userId);
    Task<List<StorageNode>> GetManyAsync(Guid userId);
    Task<List<StorageNode>> GetManyAsync(FilterDefinition<StorageNode> filter, Guid userId);
    Task<long?> GetFilesSizeAsync(FilterDefinition<StorageNode> filter, Guid userId);
    Task CreateNodeAsync(StorageNode node, Guid userId);
    Task<StorageNode> UpdateOneAsync(FilterDefinition<StorageNode> filter, Guid userId, UpdateDefinition<StorageNode> update);
    Task BulkWriteAsync(Dictionary<ObjectId, UpdateDefinition<StorageNode>> updates, Guid userId);
    Task DeleteNodesAsync(IEnumerable<ObjectId> nodeIds, Guid userId);
    
    Task<bool> ExistsAsync(FilterDefinition<StorageNode> filter, Guid userId);
}

public class StorageNodeRepository(IMongoDatabase db): IStorageNodeRepository
{
    private readonly IMongoCollection<StorageNode> _collection = db.GetCollection<StorageNode>(MongoDbCollections.StorageNodes);

    public Task<StorageNode> GetOneAsync(FilterDefinition<StorageNode> filter, Guid userId)
    {
        var userFilter = Builders<StorageNode>.Filter.Eq(x => x.OwnerId, userId);
        return _collection.Find(Builders<StorageNode>.Filter.And(userFilter, filter))
            .Limit(1)
            .FirstOrDefaultAsync();
    }
    
    public Task<List<StorageNode>> GetManyAsync(Guid userId)
    {
        var userFilter = Builders<StorageNode>.Filter.Eq(x => x.OwnerId, userId);
        return _collection.Find(userFilter).ToListAsync();
    }

    public Task<List<StorageNode>> GetManyAsync(FilterDefinition<StorageNode> filter, Guid userId)
    {
        var userFilter = Builders<StorageNode>.Filter.Eq(x => x.OwnerId, userId);
        return _collection.Find(Builders<StorageNode>.Filter.And(userFilter, filter)).ToListAsync();
    }

    public Task<long?> GetFilesSizeAsync(FilterDefinition<StorageNode> filter, Guid userId)
    {
        var userFilter = Builders<StorageNode>.Filter.Eq(x => x.OwnerId, userId);
        return _collection
            .Aggregate()
            .Match(Builders<StorageNode>.Filter.And(userFilter, filter))
            .Group(x => 1, g => g.Sum(x => x.FileSize))
            .FirstOrDefaultAsync();
    }

    public Task CreateNodeAsync(StorageNode node, Guid userId)
    {
        node.OwnerId = userId;
        node.Date = DateTime.UtcNow;
        return _collection.InsertOneAsync(node);
    }

    public Task<StorageNode> UpdateOneAsync(FilterDefinition<StorageNode> filter, Guid userId, UpdateDefinition<StorageNode> update)
    {
        var userFilter = Builders<StorageNode>.Filter.Eq(x => x.OwnerId, userId);
        var option = new FindOneAndUpdateOptions<StorageNode> { ReturnDocument = ReturnDocument.After };
        return _collection.FindOneAndUpdateAsync(Builders<StorageNode>.Filter.And(userFilter, filter), update, option);
    }

    public Task BulkWriteAsync(Dictionary<ObjectId, UpdateDefinition<StorageNode>> updates, Guid userId)
    {
        var writeModels = updates
            .Select(kvp =>
            {
                var filter = Builders<StorageNode>.Filter.And(
                    Builders<StorageNode>.Filter.Eq(x => x.OwnerId, userId),
                    Builders<StorageNode>.Filter.Eq(x => x.Id, kvp.Key)
                );

                return new UpdateOneModel<StorageNode>(filter, kvp.Value);
            })
            .Cast<WriteModel<StorageNode>>()
            .ToList();

        return _collection.BulkWriteAsync(writeModels);
    }

    public Task DeleteNodesAsync(IEnumerable<ObjectId> nodeIds, Guid userId)
    {
        var userFilter = Builders<StorageNode>.Filter.Eq(x => x.OwnerId, userId);
        var nodesFilter = Builders<StorageNode>.Filter.In(x => x.Id, nodeIds);
        return _collection.DeleteManyAsync(Builders<StorageNode>.Filter.And(userFilter, nodesFilter));
    }

    public Task<bool> ExistsAsync(FilterDefinition<StorageNode> filter, Guid userId)
    {
        var userFilter = Builders<StorageNode>.Filter.Eq(x => x.OwnerId, userId);
        return _collection.Find(Builders<StorageNode>.Filter.And(filter, userFilter)).AnyAsync();
    }
}