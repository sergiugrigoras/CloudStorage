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

var connectionString = builder.Configuration.GetConnectionString("DB");
var _key = builder.Configuration.GetValue<string>("Jwt:Key");
var _issuer = builder.Configuration.GetValue<string>("Jwt:Issuer");


// Add services to the container.
builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlServer(connectionString));
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
    o.ValueLengthLimit = int.MaxValue;
    o.MultipartBodyLengthLimit = int.MaxValue;
    o.MultipartHeadersLengthLimit = int.MaxValue;
    o.MemoryBufferThreshold = int.MaxValue;
});
builder.Services.Configure<IISServerOptions>(options =>
{
    options.MaxRequestBodySize = 1073741824; // Limit on request body size
});
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(x =>
{
    x.RequireHttpsMetadata = false;
    x.SaveToken = true;
    x.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_key)),
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidIssuer = _issuer,
        ValidAudience = _issuer
    };
});

builder.Services.AddTransient<ITokenService, TokenService>();
builder.Services.AddTransient<IFsoService, FsoService>();
builder.Services.AddTransient<IMediaService, MediaService>();
builder.Services.AddTransient<IUserService, UserService>();
builder.Services.AddTransient<INoteService, NoteService>();
// services.AddTransient<IShareService, ShareService>();
if (builder.Environment.IsProduction())
{
    builder.Services.AddSingleton<IMailService, MailService>();

}
else
{
    builder.Services.AddSingleton<IMailService>(s => new DevMailService(builder.Environment.ContentRootPath));

}

builder.Services.AddControllers();
builder.Services.AddSpaYarp();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
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
