using CloudStorage.Interfaces;
using CloudStorage.Interfaces.Expense;
using CloudStorage.Interfaces.Media;
using CloudStorage.Repositories.Expense;
using CloudStorage.Repositories.Media;
using CloudStorage.Services;

namespace CloudStorage.Extensions;

public static class ServiceExtension
{
    public static IServiceCollection RegisterServices(this IServiceCollection services,  IWebHostEnvironment environment)
    {
        services.AddSingleton<ContentAuthorization>();
        services.AddTransient<ITokenService, TokenService>();
        services.AddTransient<IFsoService, FsoService>();
        services.AddTransient<IUserService, UserService>();
        services.AddTransient<INoteService, NoteService>();
        
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

        return services;
    }
}