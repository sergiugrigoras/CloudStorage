namespace CloudStorage.Services;

public interface ICookieOptionsProvider
{
    CookieOptions GetOptions();
}

public class DevCookieOptionsProvider : ICookieOptionsProvider
{
    public CookieOptions GetOptions()
    {
        return new CookieOptions
        {
            HttpOnly = true,
            Secure = false,
            SameSite = SameSiteMode.Lax,
            Path = CookiePaths.RefreshTokenPath,
            Expires = DateTime.UtcNow.AddDays(1)
        };
    }
}

public class CookieOptionsProvider : ICookieOptionsProvider
{
    public CookieOptions GetOptions()
    {
        return new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Strict,
            Path = CookiePaths.RefreshTokenPath,
            Expires = DateTime.UtcNow.AddDays(7)
        };
    }
}

public static class CookieNames
{
    public const string RefreshToken = "RefreshToken";
    public const string ContentKey = "ContentKey";
}

public static class CookiePaths
{
    public const string RefreshTokenPath = "/api/auth/refresh";
}