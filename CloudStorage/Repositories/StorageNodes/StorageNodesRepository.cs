using System.Linq.Expressions;
using CloudStorage.Interfaces.StorageNodes;
using CloudStorage.Models;
using MongoDB.Driver;

namespace CloudStorage.Repositories.StorageNodes;

public class StorageNodesRepository: IStorageNodesRepository
{
    private const string CollectionName = "storage_nodes";
    private readonly IMongoCollection<StorageNode> _collection;

    public StorageNodesRepository(IMongoDatabase db)
    {
        _collection = db.GetCollection<StorageNode>(CollectionName);
        CreateIndexes();
    }
    private void CreateIndexes()
    {
        var indexKeys = Builders<StorageNode>.IndexKeys
            .Ascending(x => x.OwnerId)
            .Ascending(x => x.ParentId)
            .Ascending(x => x.Name)
            .Ascending(x => x.Extension)
            .Ascending(x => x.IsFolder);
        
        var indexModel = new CreateIndexModel<StorageNode>(indexKeys, new CreateIndexOptions { Unique = true });

        _collection.Indexes.CreateOne(indexModel);
    }
    
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