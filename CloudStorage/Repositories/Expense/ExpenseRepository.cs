using System.Linq.Expressions;
using MongoDB.Driver;
using CloudStorage.Models.Expense;
using CloudStorage.Services;
using MongoDB.Bson;

namespace CloudStorage.Repositories.Expense;

public interface IExpenseRepository
{
    Task<ExpenseEntry> GetAsync(string id, string userId);
    Task<List<ExpenseEntry>> GetForUserAsync(string userId);
    Task<List<ExpenseEntry>> GetManyAsync(ExpenseFilter filter, string userId);
    Task CreateAsync(ExpenseEntry expenseEntry, string userId);
    Task<ExpenseEntry> UpdateAsync(ExpenseEntry expenseEntry, string userId);
    Task<ExpenseEntry> DeleteAsync(string id, string userId);
}

public class ExpenseRepository(IMongoDatabase db) : IExpenseRepository
{
    private readonly IMongoCollection<ExpenseEntry> _collection = db.GetCollection<ExpenseEntry>(MongoDbCollections.ExpenseEntries);

    public Task<ExpenseEntry> GetAsync(string id, string userId) =>
        _collection.Find(x => x.Id == id && x.UserId == userId).FirstOrDefaultAsync();

    public Task<List<ExpenseEntry>> GetForUserAsync(string userId) =>
        _collection.Find(x => x.UserId == userId).ToListAsync();

    public Task<List<ExpenseEntry>> GetManyAsync(ExpenseFilter filter, string userId) => _collection.Find(filter.ToExpression(userId)).ToListAsync();

    public Task CreateAsync(ExpenseEntry expenseEntry, string userId)
    {
        expenseEntry.UserId = userId;
        return _collection.InsertOneAsync(expenseEntry);
    }

    public Task<ExpenseEntry> UpdateAsync(ExpenseEntry expenseEntry, string userId)
    {
        var idFilter = Builders<ExpenseEntry>.Filter.Eq(x => x.Id, expenseEntry.Id);
        var userFilter = Builders<ExpenseEntry>.Filter.Eq(x => x.UserId, userId);
        var filter = Builders<ExpenseEntry>.Filter.And(idFilter, userFilter);

        var update = Builders<ExpenseEntry>.Update
            .Set(x => x.Amount, expenseEntry.Amount)
            .Set(x => x.Date, expenseEntry.Date)
            .Set(x => x.CategoryId, expenseEntry.CategoryId)
            .Set(x => x.PaymentMethodId, expenseEntry.PaymentMethodId)
            .Set(x => x.Description, expenseEntry.Description);
            
        var option = new FindOneAndUpdateOptions<ExpenseEntry> { ReturnDocument = ReturnDocument.After };
        return _collection.FindOneAndUpdateAsync(filter, update, option);
    }

    public Task<ExpenseEntry> DeleteAsync(string id, string userId)
    {
        var idFilter = Builders<ExpenseEntry>.Filter.Eq(x => x.Id, id);
        var userFilter = Builders<ExpenseEntry>.Filter.Eq(x => x.UserId, userId);
        var filter = Builders<ExpenseEntry>.Filter.And(idFilter, userFilter);
        
       return _collection.FindOneAndDeleteAsync(filter);
    }
}