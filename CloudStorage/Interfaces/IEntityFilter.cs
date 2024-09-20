using System.Linq.Expressions;

namespace CloudStorage.Interfaces;

public interface IEntityFilter<TEntity>
{
    Guid UserId { get; set; }
    Expression<Func<TEntity, bool>> ToExpression();
}