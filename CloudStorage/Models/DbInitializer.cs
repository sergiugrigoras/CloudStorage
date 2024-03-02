using BC = BCrypt.Net.BCrypt;

namespace CloudStorage.Models;

internal static class DbInitializer
{
    internal static void Initialize(AppDbContext dbContext)
    {
        ArgumentNullException.ThrowIfNull(dbContext, nameof(dbContext));
        dbContext.Database.EnsureCreated();
        if (dbContext.Users.Any()) return;

        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = "TestUser",
            Email = "testuser@mail.com",
            Password = BC.HashPassword("P@ssword1")
        };

        var root = new FileSystemObject()
        {
            Name = "root",
            IsFolder = true,
            ParentId = null,
            Date = DateTime.Now,
            OwnerId = user.Id
        };

        dbContext.Users.Add(user);
        dbContext.FileSystemObjects.Add(root);

        dbContext.SaveChanges();
    }
}

internal static class DbInitializerExtension
{
    public static IApplicationBuilder SeedInMemoryDb(this IApplicationBuilder app)
    {
        ArgumentNullException.ThrowIfNull(app, nameof(app));

        using var scope = app.ApplicationServices.CreateScope();
        var services = scope.ServiceProvider;
        try
        {
            var context = services.GetRequiredService<AppDbContext>();
            DbInitializer.Initialize(context);
        }
        catch (Exception ex)
        {
            Console.WriteLine(ex.ToString());
        }

        return app;
    }
}