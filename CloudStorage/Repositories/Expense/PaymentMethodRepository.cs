using CloudStorage.Models.Expense;
using CloudStorage.Services;
using MongoDB.Bson;
using MongoDB.Driver;

namespace CloudStorage.Repositories.Expense;


public interface IPaymentMethodRepository
{
    Task<List<PaymentMethod>> GetForUserAsync(string userId);
    Task CreateAsync(PaymentMethod paymentMethod, string userId);
    Task<PaymentMethod> UpdateAsync(PaymentMethod paymentMethod, string userId);
    Task DeleteAsync(string id, string userId);
}

public class PaymentMethodRepository(IMongoDatabase db) : IPaymentMethodRepository
{
    private readonly IMongoCollection<PaymentMethod> _collection = db.GetCollection<PaymentMethod>(MongoDbCollections.ExpensePaymentMethods);
    
    public Task<List<PaymentMethod>> GetForUserAsync(string userId) =>
        _collection.Find(x => x.UserId == userId).ToListAsync();

    public Task CreateAsync(PaymentMethod paymentMethod, string userId)
    {
        paymentMethod.UserId = userId;
        return _collection.InsertOneAsync(paymentMethod);
    }

    public Task<PaymentMethod> UpdateAsync(PaymentMethod paymentMethod, string userId)
    {
        var idFilter = Builders<PaymentMethod>.Filter.Eq(x => x.Id, paymentMethod.Id);
        var userFilter = Builders<PaymentMethod>.Filter.Eq(x => x.UserId, userId);
        var filter = Builders<PaymentMethod>.Filter.And(idFilter, userFilter);

        var update = Builders<PaymentMethod>.Update
            .Set(x => x.Name, paymentMethod.Name)
            .Set(x => x.IsActive, paymentMethod.IsActive);

        var option = new FindOneAndUpdateOptions<PaymentMethod> { ReturnDocument = ReturnDocument.After };
        return _collection.FindOneAndUpdateAsync(filter, update, option);
    }

    public Task DeleteAsync(string id, string userId) => _collection.DeleteOneAsync(x => x.Id == id && x.UserId == userId);
}