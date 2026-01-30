using System.Linq.Expressions;
using CloudStorage.Models;
using MongoDB.Driver;

namespace CloudStorage.Interfaces.StorageNodes;

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