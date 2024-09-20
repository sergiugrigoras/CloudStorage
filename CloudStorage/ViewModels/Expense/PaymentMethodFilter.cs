using System.Linq.Expressions;
using CloudStorage.Extensions;
using CloudStorage.Interfaces;
using CloudStorage.Models;

namespace CloudStorage.ViewModels.Expense;

public class PaymentMethodFilter : IEntityFilter<PaymentMethod>
{
    public Guid UserId { get; set; } = Guid.Empty;
    public bool? Active { get; set; }

    public Expression<Func<PaymentMethod, bool>> ToExpression()
    {
        Expression<Func<PaymentMethod, bool>> expression = x => x.UserId == UserId;
        if (Active.HasValue)
            expression = expression.AndAlso(x => x.IsActive == Active.Value);
        return expression;
    }
}