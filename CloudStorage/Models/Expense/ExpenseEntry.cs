using System.Linq.Expressions;
using CloudStorage.Extensions;
using CloudStorage.Interfaces;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace CloudStorage.Models.Expense;

public class ExpenseEntry
{
    [BsonId]
    public ObjectId Id { get; set; }
    
    public string Description { get; set; }
    public decimal Amount { get; set; }
    public DateTime Date { get; set; }
    
    [BsonRepresentation(BsonType.String)]
    public Guid UserId { get; set; }
    
    public ObjectId CategoryId { get; set; }
    
    public ObjectId PaymentMethodId { get; set; }
}

public class ExpenseViewModel
{
    public string Id { get; set; }
    public string Description { get; set; }
    public decimal Amount { get; set; }
    public DateTime Date { get; set; }
    
    public string CategoryId { get; set; }
    public CategoryViewModel Category { get; set; }
    
    public string PaymentMethodId { get; set; }
    public PaymentMethodViewModel PaymentMethod { get; set; }

    public static ExpenseViewModel FromDomain(ExpenseEntry expenseEntry)
    {
        if (expenseEntry == null) return null;
        return new ExpenseViewModel
        {
            Id = expenseEntry.Id.ToString(),
            Description = expenseEntry.Description,
            Amount = expenseEntry.Amount,
            Date = DateTime.SpecifyKind(expenseEntry.Date, DateTimeKind.Utc),
            CategoryId = expenseEntry.CategoryId.ToString(),
            PaymentMethodId = expenseEntry.PaymentMethodId.ToString()
        };
    }

    public ExpenseEntry ToDomain()
    {
        return new ExpenseEntry
        {
            Id = ObjectId.TryParse(Id, out var id) ? id : ObjectId.Empty,
            Amount = Amount,
            Description = Description,
            Date = Date,
            CategoryId = ObjectId.TryParse(CategoryId, out var categoryId) ? categoryId : ObjectId.Empty,
            PaymentMethodId = ObjectId.TryParse(PaymentMethodId, out var paymentMethodId) ? paymentMethodId : ObjectId.Empty
        };
    }
}

public class ExpenseFilter : IEntityFilter<ExpenseEntry>
{
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public ICollection<ObjectId> CategoryIds { get; set; }
    public Expression<Func<ExpenseEntry, bool>> ToExpression(Guid userId)
    {
        Expression<Func<ExpenseEntry, bool>> expression = x => x.UserId == userId;
        if (StartDate.HasValue)
            expression = expression.AndAlso(x => x.Date >= StartDate.Value);
        if (EndDate.HasValue)
            expression = expression.AndAlso(x => x.Date <= EndDate.Value);
        if (CategoryIds is {Count: > 0})
            expression = expression.AndAlso(x => CategoryIds.Contains(x.CategoryId));

        return expression;
    }
}