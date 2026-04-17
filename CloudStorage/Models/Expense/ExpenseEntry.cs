using System.Linq.Expressions;
using CloudStorage.Extensions;
using CloudStorage.Interfaces;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace CloudStorage.Models.Expense;

public class ExpenseEntry
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; }
    
    public string Description { get; set; }
    public decimal Amount { get; set; }
    public DateTime Date { get; set; }
    
    [BsonRepresentation(BsonType.ObjectId)]
    public string UserId { get; set; }
    
    [BsonRepresentation(BsonType.ObjectId)]
    public string CategoryId { get; set; }
    [BsonRepresentation(BsonType.ObjectId)]
    public string PaymentMethodId { get; set; }
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
            Id = expenseEntry.Id,
            Description = expenseEntry.Description,
            Amount = expenseEntry.Amount,
            Date = DateTime.SpecifyKind(expenseEntry.Date, DateTimeKind.Utc),
            CategoryId = expenseEntry.CategoryId,
            PaymentMethodId = expenseEntry.PaymentMethodId
        };
    }

    public ExpenseEntry ToDomain()
    {
        return new ExpenseEntry
        {
            Id = Id,
            Amount = Amount,
            Description = Description,
            Date = Date,
            CategoryId = CategoryId,
            PaymentMethodId = PaymentMethodId
        };
    }
}

public class ExpenseFilter : IEntityFilter<ExpenseEntry>
{
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public ICollection<string> CategoryIds { get; set; }
    public Expression<Func<ExpenseEntry, bool>> ToExpression(string userId)
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