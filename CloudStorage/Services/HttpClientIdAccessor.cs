namespace CloudStorage.Services;

public interface IClientIdAccessor
{
    string ClientId { get; }
}

public class HttpClientIdAccessor(IHttpContextAccessor httpContextAccessor) : IClientIdAccessor
{
    public string ClientId =>
        httpContextAccessor.HttpContext?.Request.Headers["X-Client-Id"].ToString() is { Length: > 0 } id
            ? id
            : null;
}