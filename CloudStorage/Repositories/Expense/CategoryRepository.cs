using CloudStorage.Models.Expense;
using CloudStorage.Services;
using MongoDB.Bson;
using MongoDB.Driver;

namespace CloudStorage.Repositories.Expense;

public interface ICategoryRepository
{
    Task<Category> GetAsync(string id, string userId);
    Task<List<Category>> GetForUserAsync(string userId);
    Task<List<Category>> GetAsync();
    Task CreateAsync(Category category, string userId);
    Task<Category> UpdateAsync(Category category, string userId);
    Task DeleteAsync(string id, string userId);
}

public class CategoryRepository(IMongoDatabase db) : ICategoryRepository
{
    private readonly IMongoCollection<Category> _collection = db.GetCollection<Category>(MongoDbCollections.ExpenseCategories);
    
    public Task<Category> GetAsync(string id, string userId) => _collection.Find(BuildUserAndIdFilter(userId, id)).FirstOrDefaultAsync();
    
    public Task<List<Category>> GetForUserAsync(string userId) =>
        _collection.Find(x => x.UserId == userId || x.UserId == null).ToListAsync();

    public Task<List<Category>> GetAsync() => _collection.Find(x => x.UserId == null).ToListAsync();

    public Task CreateAsync(Category category, string userId)
    {
        category.UserId = userId;
        return _collection.InsertOneAsync(category);
    }

    public Task<Category> UpdateAsync(Category category, string userId)
    {
        var update = Builders<Category>.Update
            .Set(x => x.Name, category.Name)
            .Set(x => x.Emoji, category.Emoji);

        var option = new FindOneAndUpdateOptions<Category> { ReturnDocument = ReturnDocument.After };
        return _collection.FindOneAndUpdateAsync(BuildUserAndIdFilter(userId, category.Id), update, option);
    }

    public Task DeleteAsync(string id, string userId) => _collection.DeleteOneAsync(BuildUserAndIdFilter(userId, id));

    private static FilterDefinition<Category> BuildUserAndIdFilter(string userId, string categoryId)
    {
        var idFilter = Builders<Category>.Filter.Eq(x => x.Id, categoryId);
        var userFilter = Builders<Category>.Filter.Eq(x => x.UserId, userId);
        return Builders<Category>.Filter.And(idFilter, userFilter);
    }
}