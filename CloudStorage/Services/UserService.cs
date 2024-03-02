using BC = BCrypt.Net.BCrypt;
using Microsoft.EntityFrameworkCore;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using CloudStorage.Models;

namespace CloudStorage.Services;

public interface IUserService
{
    Task<User> GetUserAsync(ClaimsPrincipal principal);
    Task<User> GetUserByNameAsync(string name);
    Task<User> GetUserByEmailAsync(string email);
    Task<User> GetUserByIdAsync(Guid id);
    Task UpdateUserAsync(User user);
    Task CreateUserAsync(User user);
    IEnumerable<Claim> GetUserClaims(User user);
    Task<ResetToken> CreateResetTokenAsync(User user, string token);
    Task<ResetToken> GetResetTokenByIdAsync(int id);
    Task UpdateResetTokenAsync(ResetToken resetToken);

    string GenerateToken();
}

public class UserService(AppDbContext context) : IUserService
{
    public async Task CreateUserAsync(User user)
    {
        await context.Users.AddAsync(user);
        await context.SaveChangesAsync();
    }

    public async Task<ResetToken> CreateResetTokenAsync(User user, string token)
    {
        var resetToken = new ResetToken
        {
            UserId = user.Id,
            TokenHash = BC.HashPassword(token),
            ExpirationDate = DateTime.Now.AddHours(1)
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
        if (name == null)
        {
            return null;
        }
        var user = await context.Users.FirstOrDefaultAsync(x => x.Username.ToLower() == name.ToLower());
        return user;
    }

    public IEnumerable<Claim> GetUserClaims(User user)
    {
        if (user == null) return null;
        return new List<Claim>
        {
            new(ClaimTypes.Name, user.Username),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(JwtRegisteredClaimNames.Jti, user.Id.ToString()),
        };
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

    public string GenerateToken()
    {
        var randomNumber = new byte[64];
        using (var rng = RandomNumberGenerator.Create())
        {
            rng.GetBytes(randomNumber);
        }
        var token = Convert.ToBase64String(randomNumber).TrimEnd('=').Replace('+', '-').Replace('/', '_');
        return token;
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