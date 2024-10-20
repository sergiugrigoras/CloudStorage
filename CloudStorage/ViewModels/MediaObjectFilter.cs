using CloudStorage.Models;
using System.Linq.Expressions;
using CloudStorage.Extensions;

namespace CloudStorage.ViewModels;

public class MediaObjectFilter
{
    public bool? Favorite { get; set; }
    public bool? Deleted { get; set; }
    public IEnumerable<Guid> Ids { get; set; } = [];
    public Guid UserId { get; set; } = Guid.Empty;

    public MediaObjectFilter()
    {
    }

    public Expression<Func<MediaObject, bool>> ToExpression()
    {
        Expression<Func<MediaObject, bool>> expression = x => x.OwnerId == UserId;;

        if (Favorite.HasValue)
            expression = expression.AndAlso(x => x.Favorite == Favorite.Value);
        if (Deleted.HasValue)
            expression = expression.AndAlso(x => x.MarkedForDeletion == Deleted.Value);
        if (Ids != null && Ids.Any())
            expression = expression.AndAlso(x => Ids.Contains(x.Id));

        return expression;
    }
}