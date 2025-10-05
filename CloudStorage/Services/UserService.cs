using BC = BCrypt.Net.BCrypt;
using Microsoft.EntityFrameworkCore;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using CloudStorage.Extensions;
using CloudStorage.Models;
using CloudStorage.ViewModels;
using Microsoft.IdentityModel.Tokens;

namespace CloudStorage.Services;

public interface IUserService
{
    Task<User> GetUserAsync(ClaimsPrincipal principal);
    Task<User> GetUserByNameAsync(string name);
    Task<User> GetUserByEmailAsync(string email);
    Task<User> GetUserByIdAsync(Guid id);
    Task UpdateUserAsync(User user);
    Task<TokenApiModel> CreateUserAsync(User user);
    IEnumerable<Claim> GetUserClaims(User user);
    Task<ResetToken> CreateResetTokenAsync(User user, string token);
    Task<ResetToken> GetResetTokenByIdAsync(int id);
    Task UpdateResetTokenAsync(ResetToken resetToken);
    Task<bool> ValidateInviteCodeAsync(string code, string email);
    Task<string> CreateInviteCodeAsync(string email);
    Task<List<User>> GetAllUsersAsync();
    string GenerateToken();
}

public class UserService(AppDbContext context, IConfiguration configuration, ITokenService tokenService, IFsoService fsoService) : IUserService
{
    private readonly IConfiguration _configuration =
        configuration ?? throw new ArgumentNullException(nameof(configuration));
    private readonly ITokenService _tokenService = tokenService ?? throw new ArgumentNullException(nameof(tokenService));
    public async Task<TokenApiModel> CreateUserAsync(User user)
    {
        if (await GetUserByNameAsync(user.Username) != null || await GetUserByEmailAsync(user.Email) != null)
        {
            throw new Exception("User already exists");
        }
        user.Id = Guid.NewGuid();
        var claims = GetUserClaims(user);
        var accessToken = _tokenService.GenerateAccessToken(claims);
        var refreshToken = _tokenService.GenerateRefreshToken();
        var hashPassword = BC.HashPassword(user.Password);

        user.Password = hashPassword;
        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);
        user.Disabled = false;
        user.FileSystemObjects = [new FileSystemObject { Name = "root", IsFolder = true, Date = DateTime.UtcNow }];
        await context.Users.AddAsync(user);
        await context.SaveChangesAsync();

        return new TokenApiModel(accessToken, refreshToken);
    }

    public async Task<ResetToken> CreateResetTokenAsync(User user, string token)
    {
        var userHasUnexpiredToken = await context.ResetTokens.AnyAsync(x => x.UserId == user.Id && x.ExpirationDate >= DateTime.UtcNow && x.TokenUsed == false);
        if (userHasUnexpiredToken) throw new Exception("Unable to create reset token");
        var resetToken = new ResetToken
        {
            UserId = user.Id,
            TokenHash = BC.HashPassword(token),
            ExpirationDate = DateTime.UtcNow.AddMinutes(15)
        };

        await context.ResetTokens.AddAsync(resetToken);
        await context.SaveChangesAsync();
        return resetToken;
    }

    public async Task<User> GetUserByEmailAsync(string email)
    {
        if (email == null)
        {
            return null;
        }
        var user = await context.Users.FirstOrDefaultAsync(x => x.Email.ToLower() == email.ToLower());
        return user;
    }

    public async Task<User> GetUserByNameAsync(string name)
    {
        if (name == null) return null;
        var user = await context.Users.FirstOrDefaultAsync(x => x.Username.ToLower() == name.ToLower());
        return user;
    }

    public IEnumerable<Claim> GetUserClaims(User user)
    {
        if (user == null) return null;
        var claims = new List<Claim>
        {
            new(ClaimTypes.Name, user.Username),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(JwtRegisteredClaimNames.Jti, user.Id.ToString()),
        };
        var isAdmin = string.Equals(user.Email, _configuration.AdminEmail(), StringComparison.OrdinalIgnoreCase);
        claims.Add(new Claim(ClaimTypes.Role, isAdmin ? Roles.Admin : Roles.User));
        return claims;
    }

    public async Task<User> GetUserAsync(ClaimsPrincipal principal)
    {
        var jti = principal.FindFirst(JwtRegisteredClaimNames.Jti);
        if (jti == null) return null;
        var value = jti.Value;
        if (!Guid.TryParse(value, out var userId)) return null;
        var user = await context.Users.FindAsync(userId);
        return user;
    }

    public async Task UpdateUserAsync(User user)
    {
        context.Users.Update(user);
        await context.SaveChangesAsync();
    }

    public async Task<bool> ValidateInviteCodeAsync(string code, string email)
    {
        if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(email)) return false;
        var inviteCode = await context.InviteCodes.FirstOrDefaultAsync(x => x.Email.ToLower() == email.ToLower() && x.Date == null);
        if (inviteCode == null || !BC.Verify(code.ToUpper(), inviteCode.Code)) return false;
        inviteCode.Date = DateTime.UtcNow;
        await context.SaveChangesAsync();
        return true;
    }

    public async Task<string> CreateInviteCodeAsync(string email)
    {
        var userExists = await GetUserByEmailAsync(email);
        if (userExists != null) throw new Exception("User already registered");
        await RemoveExistingInviteCodes(email);
        var code = GenerateInviteCode(6);
        var inviteCode = new InviteCode
        {
            Id = Guid.NewGuid(),
            Email = email,
            Code = BC.HashPassword(code),
            Date = null
        };
        await context.InviteCodes.AddAsync(inviteCode);
        await context.SaveChangesAsync();
        return code;
    }

    private async Task RemoveExistingInviteCodes(string email)
    {
        var inviteCodes = await context.InviteCodes
            .Where(x => x.Email.ToLower() == email.ToLower() && x.Date == null)
            .ToListAsync();
        if (inviteCodes.Count == 0) return;
        context.RemoveRange(inviteCodes);
        await context.SaveChangesAsync();
    }

    public async Task<List<User>> GetAllUsersAsync() => await context.Users.ToListAsync();

    public string GenerateToken()
    {
        var randomNumber = new byte[32];
        using (var rng = RandomNumberGenerator.Create())
        {
            rng.GetBytes(randomNumber);
        }
        
        return Base64UrlEncoder.Encode(randomNumber);
    }

    private static string GenerateInviteCode(int length = 6)
    {
        var random = new Random();
        const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        var code = new char[length];
        for (var i = 0; i < length; i++)
            code[i] = chars[random.Next(chars.Length)];
        return new string(code);
    }

    public async Task<ResetToken> GetResetTokenByIdAsync(int id)
    {
        var resetToken = await context.ResetTokens.FindAsync(id);
        return resetToken;
    }

    public async Task<User> GetUserByIdAsync(Guid id)
    {
        var user = await context.Users.FindAsync(id);
        return user;
    }

    public async Task UpdateResetTokenAsync(ResetToken resetToken)
    {
        context.ResetTokens.Update(resetToken);
        await context.SaveChangesAsync();
    }
}