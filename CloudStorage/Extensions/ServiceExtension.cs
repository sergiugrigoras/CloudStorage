using CloudStorage.Interfaces;
using CloudStorage.Interfaces.Expense;
using CloudStorage.Repositories.Expense;
using CloudStorage.Services;

namespace CloudStorage.Extensions;

public static class ServiceExtension
{
    public static IServiceCollection RegisterServices(this IServiceCollection services,  IWebHostEnvironment environment)
    {
        services.AddSingleton<ContentAuthorization>();
        services.AddTransient<ITokenService, TokenService>();
        services.AddTransient<IFsoService, FsoService>();
        services.AddTransient<IMediaService, MediaService>();
        services.AddTransient<IUserService, UserService>();
        services.AddTransient<INoteService, NoteService>();
        
        services.AddScoped<IExpenseRepository, ExpenseRepository>();
        services.AddScoped<ICategoryRepository, CategoryRepository>();
        services.AddScoped<IPaymentMethodRepository, PaymentMethodRepository>();
        services.AddScoped<IExpenseUnitOfWork, ExpenseUnitOfWork>();
        services.AddScoped<IExpenseService, ExpenseService>();

        if (environment.IsProduction())
            services.AddSingleton<IMailService, MailService>();
        else
            services.AddSingleton<IMailService>(s => new DevMailService(environment.ContentRootPath));
        return services;
    }
}