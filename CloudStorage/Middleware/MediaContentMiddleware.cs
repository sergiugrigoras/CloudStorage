using System.Globalization;

namespace CloudStorage.Middleware
{
    public class MediaContentMiddleware
    {
        private readonly RequestDelegate _next;

        public MediaContentMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            await _next(context);
        }
    }

    public static class MediaContentMiddlewareExtensions
    {
        public static IApplicationBuilder UseMediaContent(
            this IApplicationBuilder builder)
        {
            return builder.UseMiddleware<MediaContentMiddleware>();
        }
    }
}
