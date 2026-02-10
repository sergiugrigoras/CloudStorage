using System.Linq.Expressions;
using CloudStorage.Models;
using CloudStorage.Services;
using MongoDB.Driver;

namespace CloudStorage.Repositories.StorageNodes;

public interface IStorageNodesRepository
{
    Task<StorageNode> GetOneAsync(Expression<Func<StorageNode, bool>> filter);
    Task<StorageNode> GetByIdAsync(string id);
    Task<List<StorageNode>> GetManyAsync(Expression<Func<StorageNode, bool>> filter);
    Task<List<StorageNode>> GetManyAsync(FilterDefinition<StorageNode> filter);

    Task CreateNodeAsync(StorageNode node);
    Task<StorageNode> UpdateOneAsync(FilterDefinition<StorageNode> filter, UpdateDefinition<StorageNode> update);
    Task BulkWriteAsync(IEnumerable<WriteModel<StorageNode>> model);
    Task DeleteNodesAsync(IEnumerable<string> nodeIds);
    
    Task<bool> ExistsAsync(Expression<Func<StorageNode, bool>> filter);
    Task<bool> ExistsAsync(FilterDefinition<StorageNode> filter);
}

public class StorageNodesRepository(IMongoDatabase db): IStorageNodesRepository
{
    private readonly IMongoCollection<StorageNode> _collection = db.GetCollection<StorageNode>(MongoDbCollections.StorageNodes);
        
    public Task<StorageNode> GetOneAsync(Expression<Func<StorageNode,bool>> filter) => _collection.Find(filter).Limit(1).FirstOrDefaultAsync();
    
    public Task<StorageNode> GetByIdAsync(string id) => GetOneAsync(x => x.Id == id);

    public Task<List<StorageNode>> GetManyAsync(Expression<Func<StorageNode, bool>> filter) =>
        _collection.Find(filter).ToListAsync();

    public Task<List<StorageNode>> GetManyAsync(FilterDefinition<StorageNode> filter) =>  _collection.Find(filter).ToListAsync();

    public Task CreateNodeAsync(StorageNode node) => _collection.InsertOneAsync(node);
    
    public Task<StorageNode> UpdateOneAsync(FilterDefinition<StorageNode> filter, UpdateDefinition<StorageNode> update)
    {
        var option = new FindOneAndUpdateOptions<StorageNode> { ReturnDocument = ReturnDocument.After };
        return _collection.FindOneAndUpdateAsync(filter, update, option);
    }

    public Task BulkWriteAsync(IEnumerable<WriteModel<StorageNode>> model) => _collection.BulkWriteAsync(model);

    public Task DeleteNodesAsync(IEnumerable<string> nodeIds) =>
        _collection.DeleteManyAsync(Builders<StorageNode>.Filter.In(x => x.Id, nodeIds));

    public Task<bool> ExistsAsync(Expression<Func<StorageNode, bool>> filter) => _collection.Find(filter).AnyAsync();
    
    public Task<bool> ExistsAsync(FilterDefinition<StorageNode> filter) => _collection.Find(filter).AnyAsync();
}