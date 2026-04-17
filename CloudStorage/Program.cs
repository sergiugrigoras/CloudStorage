using CloudStorage.Middleware;
using CloudStorage.Models;
using FFMpegCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using CloudStorage.Extensions;
using CloudStorage.Services;

var builder = WebApplication.CreateBuilder(args);
builder.Configuration.AddEnvironmentVariables(prefix: "CloudStorage_");

var jwtKey = builder.Configuration.GetValue<string>("Jwt:Key");
var jwtIssuer = builder.Configuration.GetValue<string>("Jwt:Issuer");

builder.Services.RegisterMongoDb(builder.Configuration);
builder.Services.AddHostedService<MongoDbInitializer>();

var allowedOrigins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>();
builder.Services.AddCors(options =>
{
    options.AddPolicy("EnableCORS", policyBuilder =>
    {
        if (allowedOrigins is { Length: > 0 })
        {
            policyBuilder.WithOrigins(allowedOrigins)
                .AllowAnyHeader()
                .AllowAnyMethod();
        }
        else
        {
            policyBuilder.AllowAnyOrigin()
                .AllowAnyHeader()
                .AllowAnyMethod();
        }
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
    x.MapInboundClaims = false;
    x.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtIssuer,
        ClockSkew = builder.Environment.IsDevelopment() ? TimeSpan.Zero : TimeSpan.FromMinutes(2),
        RoleClaimType = AppClaims.Role
    };
});
builder.Services.AddAuthorizationBuilder()
    .AddPolicy("Admin", policy => policy.RequireRole(Roles.Admin))
    .AddPolicy("User", policy => policy.RequireRole(Roles.User, Roles.Admin));

builder.Services.RegisterServices(builder.Configuration, builder.Environment);

builder.Services.AddControllers();
builder.Services.AddSpaYarp();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}
app.UseCors("EnableCORS");
app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
});
app.UseHttpsRedirection();
app.UseMediaContent();
app.UseCsp();
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
