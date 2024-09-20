using System.Linq.Expressions;
using CloudStorage.Interfaces;
using CloudStorage.Models;

namespace CloudStorage.ViewModels.Expense;

public class CategoryFilter : IEntityFilter<Category>
{
    public Guid UserId { get; set; } = Guid.Empty;
    public Expression<Func<Category, bool>> ToExpression()
    {
        Expression<Func<Category, bool>> expression = x => x.UserId == UserId;
        return expression;
    }
}