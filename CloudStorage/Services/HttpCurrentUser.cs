using System.Security.Claims;

namespace CloudStorage.Services;

public interface ICurrentUser
{
    Guid UserId { get; }
    bool IsAuthenticated { get; }
}

public class HttpCurrentUser : ICurrentUser
{
    public Guid UserId { get; }
    public bool IsAuthenticated { get; }
    
    
    public HttpCurrentUser(IHttpContextAccessor httpContextAccessor)
    {
        var user = httpContextAccessor.HttpContext?.User;

        IsAuthenticated = user?.Identity?.IsAuthenticated == true;

        if (IsAuthenticated)
        {
            var identity = user?.FindFirstValue(ClaimTypes.NameIdentifier);
            UserId =  Guid.TryParse(identity, out var userId) ? userId : Guid.Empty;
        }
        else
        {
            UserId = Guid.Empty;
        }
    }
}