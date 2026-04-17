using System.IdentityModel.Tokens.Jwt;
using System.Linq.Expressions;
using System.Security.Claims;
using MongoDB.Bson;

namespace CloudStorage.Extensions;

public static class Extension
{
    // https://stackoverflow.com/a/457328
    public static Expression<Func<T, bool>> AndAlso<T>(
        this Expression<Func<T, bool>> expr1,
        Expression<Func<T, bool>> expr2)
    {
        var parameter = Expression.Parameter(typeof(T));

        var leftVisitor = new ReplaceExpressionVisitor(expr1.Parameters[0], parameter);
        var left = leftVisitor.Visit(expr1.Body);

        var rightVisitor = new ReplaceExpressionVisitor(expr2.Parameters[0], parameter);
        var right = rightVisitor.Visit(expr2.Body);

        return Expression.Lambda<Func<T, bool>>(
            Expression.AndAlso(left, right), parameter);
    }

    private class ReplaceExpressionVisitor(Expression oldValue, Expression newValue) : ExpressionVisitor
    {
        public override Expression Visit(Expression node)
        {
            if (node == oldValue)
                return newValue;
            return base.Visit(node);
        }
    }

    public static string AdminEmail(this IConfiguration configuration) =>
        configuration.GetValue<string>("Authorization:AdminEmail");
    public static bool InviteOnly(this IConfiguration configuration) =>
        configuration.GetValue<bool>("Registration:InviteOnly");
    
    public static string AesKey(this IConfiguration configuration) =>
        configuration.GetValue<string>("AesSettings:Key");
    public static string AesIv(this IConfiguration configuration) =>
        configuration.GetValue<string>("AesSettings:IV");

    public static string StorageSize(this IConfiguration configuration) =>
        configuration.GetValue<string>("Storage:Size");
    public static string StorageUrl(this IConfiguration configuration) =>
        configuration.GetValue<string>("Storage:Url");
}