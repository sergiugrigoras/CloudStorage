using System.Linq.Expressions;
using CloudStorage.Extensions;
using CloudStorage.Interfaces;
using CloudStorage.Models;

namespace CloudStorage.ViewModels.Expense;


public class ExpenseFilter : IEntityFilter<Models.Expense>
{
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public ICollection<Guid> Categories { get; set; } = [];
    public Guid UserId { get; set; } = Guid.Empty;
    public Expression<Func<Models.Expense, bool>> ToExpression()
    {
        Expression<Func<Models.Expense, bool>> expression = x => x.UserId == UserId;
        if (StartDate.HasValue)
            expression = expression.AndAlso(x => x.Date >= StartDate.Value);
        if (EndDate.HasValue)
            expression = expression.AndAlso(x => x.Date <= EndDate.Value);
        if (Categories?.Count > 0)
            expression = expression.AndAlso(x => Categories.Contains(x.Category.Id));

        return expression;
    }
}