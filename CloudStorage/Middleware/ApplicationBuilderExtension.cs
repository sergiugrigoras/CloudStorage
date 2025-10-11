namespace CloudStorage.Middleware;

public static class ApplicationBuilderExtension
{
    public static IApplicationBuilder UseMediaContent(this IApplicationBuilder builder) =>
        builder.UseMiddleware<MediaContentMiddleware>();
    
    public static IApplicationBuilder UseCsp(this IApplicationBuilder builder) =>
        builder.UseMiddleware<CspMiddleware>();
}