using CloudStorage.Interfaces;
using CloudStorage.Interfaces.Expense;
using CloudStorage.Interfaces.Media;
using CloudStorage.Interfaces.Notes;
using CloudStorage.Interfaces.StorageNodes;
using CloudStorage.Models;
using CloudStorage.Repositories.Expense;
using CloudStorage.Repositories.Media;
using CloudStorage.Repositories.Notes;
using CloudStorage.Repositories.StorageNodes;
using CloudStorage.Services;
using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace CloudStorage.Extensions;

public static class ServiceExtension
{
    public static IServiceCollection RegisterServices(this IServiceCollection services,  IWebHostEnvironment environment)
    {
        services.AddSingleton<ContentAuthorization>();
        services.AddScoped<ITokenService, TokenService>();
        services.AddScoped<IStorageNodeService, StorageNodeService>();
        services.AddScoped<IUserService, UserService>();
        
        services.AddScoped<IExpenseRepository, ExpenseRepository>();
        services.AddScoped<ICategoryRepository, CategoryRepository>();
        services.AddScoped<IPaymentMethodRepository, PaymentMethodRepository>();
        services.AddScoped<IExpenseUnitOfWork, ExpenseUnitOfWork>();
        services.AddScoped<IExpenseService, ExpenseService>();

        services.AddScoped<IMediaObjectRepository, MediaObjectRepository>();
        services.AddScoped<IMediaAlbumRepository, MediaAlbumRepository>();
        services.AddScoped<IMediaUnitOfWork, MediaUnitOfWork>();
        services.AddScoped<IMediaService, MediaService>();
        services.AddScoped<IStorageService, StorageService>();

        services.AddHttpClient<GeminiService>();
        services.AddScoped<IGeminiService, GeminiService>();

        if (environment.IsProduction())
        {
            services.AddScoped<IMailService, MailService>();
            services.AddScoped<ICookieOptionsProvider, CookieOptionsProvider>();
        }
        else
        {
            services.AddScoped<IMailService>(s => new DevMailService());
            services.AddScoped<ICookieOptionsProvider, DevCookieOptionsProvider>();
        }
        
        services.AddScoped<INotesRepository, NotesRepository>();
        services.AddScoped<IStorageNodesRepository, StorageNodesRepository>();

        return services;
    }

    public static IServiceCollection RegisterMongoDb(this IServiceCollection services, ConfigurationManager configuration)
    {
        services.Configure<MongoDbSettings>(
            configuration.GetSection("MongoDb"));

        services.AddSingleton<IMongoClient>(sp =>
        {
            var settings = sp.GetRequiredService<IOptions<MongoDbSettings>>().Value;
            return new MongoClient(settings.ConnectionString);
        });

        services.AddSingleton(sp =>
        {
            var settings = sp.GetRequiredService<IOptions<MongoDbSettings>>().Value;
            var client = sp.GetRequiredService<IMongoClient>();
            return client.GetDatabase(settings.DatabaseName);
        });
        
        return services;
    }
}