using System.Linq.Expressions;

namespace CloudStorage.Interfaces;

public interface IEntityFilter<TEntity>
{
    Expression<Func<TEntity, bool>> ToExpression(string userId);
}