using System.Net.Http.Headers;
using CloudStorage.Interfaces;
using CloudStorage.Models;
using CloudStorage.Models.Settings;
using CloudStorage.Repositories.Expense;
using CloudStorage.Repositories.Media;
using CloudStorage.Repositories.Note;
using CloudStorage.Repositories.StorageNodes;
using CloudStorage.Repositories.User;
using CloudStorage.Services;
using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace CloudStorage.Extensions;

public static class ServiceExtension
{
    public static IServiceCollection RegisterServices(this IServiceCollection services, ConfigurationManager configuration,  IWebHostEnvironment environment)
    {
        services.Configure<GeminiSettings>(configuration.GetSection("GeminiAPI"));
        services.Configure<MailerSendSettings>(configuration.GetSection("MailerSend"));
        
        services.AddHttpClient<GeminiClient>((sp, client) =>
        {
            var settings = sp.GetRequiredService<IOptions<GeminiSettings>>().Value;
            client.BaseAddress = new Uri($"{settings.Url}?key={settings.Key}");
            client.DefaultRequestHeaders.Accept.Add(
                new MediaTypeWithQualityHeaderValue("application/json"));
        });

        services.AddScoped<IGeminiService, GeminiService>();
        
        services.AddHttpClient<MailerSendClient>((sp, client) =>
        {
            var settings = sp.GetRequiredService<IOptions<MailerSendSettings>>().Value;
            client.BaseAddress = new Uri(settings.Url);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", settings.Token);
        });
        
        services.AddSingleton<ContentAuthorization>();
        
        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUser, HttpCurrentUser>();
        services.AddScoped<IClientIdAccessor, HttpClientIdAccessor>();
        
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IInviteRepository, InviteRepository>();
        services.AddScoped<ITokenService, TokenService>();
        services.AddScoped<IStorageNodeService, StorageNodeService>();
        services.AddScoped<IUserService, UserService>();
        
        services.AddScoped<IExpenseRepository, ExpenseRepository>();
        services.AddScoped<ICategoryRepository, CategoryRepository>();
        services.AddScoped<IPaymentMethodRepository, PaymentMethodRepository>();
        services.AddScoped<IExpenseService, ExpenseService>();
        
        services.AddScoped<IMediaEntryRepository, MediaEntryRepository>();
        services.AddScoped<IMediaEntrySystemRepository, MediaEntrySystemRepository>();
        services.AddScoped<IMediaAlbumRepository, MediaAlbumRepository>();
        services.AddScoped<IMediaStorageService, MediaStorageService>();
        services.AddScoped<IMediaService, MediaService>();
        services.AddScoped<IStorageService, StorageService>();

        


        if (environment.IsProduction())
        {
            services.AddScoped<IMailService, MailService>();
            services.AddScoped<ICookieOptionsProvider, CookieOptionsProvider>();
        }
        else
        {
            services.AddScoped<IMailService, MailService>();
            //services.AddScoped<IMailService>(s => new DevMailService());
            services.AddScoped<ICookieOptionsProvider, DevCookieOptionsProvider>();
        }
        
        services.AddScoped<INoteRepository, NoteRepository>();
        services.AddScoped<INoteService, NoteService>();
        
        services.AddScoped<IStorageNodeRepository, StorageNodeRepository>();

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