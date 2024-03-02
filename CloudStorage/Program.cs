using CloudStorage.Middleware;
using CloudStorage.Models;
using CloudStorage.Services;
using FFMpegCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);
builder.Configuration.AddEnvironmentVariables(prefix: "CloudStorage_");

var jwtKey = builder.Configuration.GetValue<string>("Jwt:Key");
var jwtIssuer = builder.Configuration.GetValue<string>("Jwt:Issuer");
var sqlite = builder.Configuration.GetValue<string>("Database:Sqlite");
var mssql = builder.Configuration.GetValue<string>("Database:MsSql");
var inMemoryDb = false;
// Add services to the container.
builder.Services.AddDbContext<AppDbContext>(options =>
{
    if (!string.IsNullOrEmpty(mssql))
        options.UseSqlServer(mssql, optionsAction => optionsAction.EnableRetryOnFailure(5, TimeSpan.FromSeconds(10), null));
    else if (!string.IsNullOrEmpty(sqlite))
        options.UseSqlite($"Data Source={sqlite}");
    else
    {
        options.UseInMemoryDatabase("db");
        inMemoryDb = true;
    }
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("EnableCORS", builder =>
    {
        builder.AllowAnyOrigin()
           .AllowAnyHeader()
           .AllowAnyMethod();
    });
});
builder.Services.Configure<FormOptions>(o =>
{
    o.ValueLengthLimit = 268435456;
    o.MultipartBodyLengthLimit = 4294967295;
    o.MultipartHeadersLengthLimit = 65365;
    o.MemoryBufferThreshold = 1048576;
});
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(x =>
{
    x.RequireHttpsMetadata = false;
    x.SaveToken = true;
    x.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtIssuer
    };
});

builder.Services.AddSingleton<ContentAuthorization>();
builder.Services.AddTransient<ITokenService, TokenService>();
builder.Services.AddTransient<IFsoService, FsoService>();
builder.Services.AddTransient<IMediaService, MediaService>();
builder.Services.AddTransient<IUserService, UserService>();
builder.Services.AddTransient<INoteService, NoteService>();
if (builder.Environment.IsProduction())
    builder.Services.AddSingleton<IMailService, MailService>();
else
    builder.Services.AddSingleton<IMailService>(s => new DevMailService(builder.Environment.ContentRootPath));

builder.Services.AddControllers();
builder.Services.AddSpaYarp();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    dbContext.Database.EnsureCreated();
}
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
    if (inMemoryDb)
        app.SeedInMemoryDb();
}
app.UseCors("EnableCORS");
// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}
app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
});
app.UseHttpsRedirection();
app.UseMediaContent();
app.UseStaticFiles();
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();
app.MapDefaultControllerRoute();
app.UseSpaYarp();
app.MapFallbackToFile("index.html");

if (OperatingSystem.IsWindows()) GlobalFFOptions.Configure(new FFOptions { BinaryFolder = @"C:\ffmpeg\bin", TemporaryFilesFolder = @"C:\ffmpeg\tmp" });
else if (OperatingSystem.IsLinux()) GlobalFFOptions.Configure(new FFOptions { BinaryFolder = "/usr/bin", TemporaryFilesFolder = "/tmp" });

app.Run();
