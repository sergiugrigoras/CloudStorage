using CloudStorage.Models.Expense;
using CloudStorage.Services;
using MongoDB.Bson;
using MongoDB.Driver;

namespace CloudStorage.Repositories.Expense;

public interface ICategoryRepository
{
    Task<Category> GetAsync(ObjectId id, Guid userId);
    Task<List<Category>> GetForUserAsync(Guid userId);
    Task<List<Category>> GetAsync();
    Task CreateAsync(Category category, Guid userId);
    Task<Category> UpdateAsync(Category category, Guid userId);
    Task DeleteAsync(ObjectId id, Guid userId);
}

public class CategoryRepository(IMongoDatabase db) : ICategoryRepository
{
    private readonly IMongoCollection<Category> _collection = db.GetCollection<Category>(MongoDbCollections.ExpenseCategories);
    
    public Task<Category> GetAsync(ObjectId id, Guid userId) => _collection.Find(BuildUserAndIdFilter(userId, id)).FirstOrDefaultAsync();
    
    public Task<List<Category>> GetForUserAsync(Guid userId) =>
        _collection.Find(x => x.UserId == userId || x.UserId == null).ToListAsync();

    public Task<List<Category>> GetAsync() => _collection.Find(x => x.UserId == null).ToListAsync();

    public Task CreateAsync(Category category, Guid userId)
    {
        category.UserId = userId;
        return _collection.InsertOneAsync(category);
    }

    public Task<Category> UpdateAsync(Category category, Guid userId)
    {
        var update = Builders<Category>.Update
            .Set(x => x.Name, category.Name)
            .Set(x => x.Emoji, category.Emoji);

        var option = new FindOneAndUpdateOptions<Category> { ReturnDocument = ReturnDocument.After };
        return _collection.FindOneAndUpdateAsync(BuildUserAndIdFilter(userId, category.Id), update, option);
    }

    public Task DeleteAsync(ObjectId id, Guid userId) => _collection.DeleteOneAsync(BuildUserAndIdFilter(userId, id));

    private static FilterDefinition<Category> BuildUserAndIdFilter(Guid userId, ObjectId categoryId)
    {
        var idFilter = Builders<Category>.Filter.Eq(x => x.Id, categoryId);
        var userFilter = Builders<Category>.Filter.Eq(x => x.UserId, userId);
        return Builders<Category>.Filter.And(idFilter, userFilter);
    }
}