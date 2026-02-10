using System.Linq.Expressions;
using CloudStorage.Extensions;
using CloudStorage.Interfaces;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace CloudStorage.Models.Expense;

public class PaymentMethod
{
    [BsonId]
    public ObjectId Id { get; set; }
    
    public string Name { get; set; }
    public bool IsActive { get; set; }
    
    [BsonRepresentation(BsonType.String)]
    public Guid UserId { get; set; }
}

public class PaymentMethodViewModel
{
    public static PaymentMethodViewModel FromDomain(PaymentMethod paymentMethod)
    {
        if (paymentMethod == null) return null;
        return new PaymentMethodViewModel
        {
            Id =  paymentMethod.Id.ToString(),
            Name = paymentMethod.Name,
            IsActive = paymentMethod.IsActive,
        };
    }
    public string Id { get; set; }
    public string Name { get; set; }
    public bool IsActive { get; set; }
    
}
