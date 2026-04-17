using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace CloudStorage.Services;

public interface ICurrentUser
{
    string UserId { get; }
    bool IsAuthenticated { get; }
}

public class HttpCurrentUser : ICurrentUser
{
    public string UserId { get; }
    public bool IsAuthenticated { get; }

    public HttpCurrentUser(IHttpContextAccessor httpContextAccessor)
    {
        var user = httpContextAccessor.HttpContext?.User;

        IsAuthenticated = user?.Identity?.IsAuthenticated == true;
        
        UserId = IsAuthenticated
            ? user?.FindFirstValue(JwtRegisteredClaimNames.Sub)
            : null;
    }
}