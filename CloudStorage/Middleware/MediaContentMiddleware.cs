using System.Globalization;

namespace CloudStorage.Middleware
{
    public class MediaContentMiddleware(RequestDelegate next)
    {
        public async Task InvokeAsync(HttpContext context)
        {
            await next(context);
        }
    }
}
