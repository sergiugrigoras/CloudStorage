using BC = BCrypt.Net.BCrypt;
using Microsoft.EntityFrameworkCore;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using CloudStorage.Extensions;
using CloudStorage.Models;
using Microsoft.IdentityModel.Tokens;
using OtpNet;

namespace CloudStorage.Services;

public interface IUserService
{
    Task<User> GetUserAsync(ClaimsPrincipal principal);
    Task<User> GetUserByNameAsync(string name);
    Task<User> GetUserByEmailAsync(string email);
    Task<User> GetUserByIdAsync(Guid id);
    Task UpdateUserAsync(User user);
    Task<User> CreateUserAsync(string username, string email, string password);
    List<Claim> GetUserClaims(User user);
    Task<ResetToken> CreatePasswordResetTokenAsync(Guid userId, string token);
    Task<ResetToken> GetResetTokenByIdAsync(int id);
    Task UpdateResetTokenAsync(ResetToken resetToken);
    Task<bool> ValidateInviteCodeAsync(string code, string email);
    Task<string> CreateInviteCodeAsync(string email);
    Task<List<User>> GetAllUsersAsync();
    string GeneratePasswordResetToken();
    Task<string> GenerateTwoFaSecretAsync(Guid userId);
    Task<bool> VerifyTotpCodeAsync(Guid userId, string code);
    Task<bool> ToggleTwoFaAsync(Guid userId, string code);
}

public class UserService(AppDbContext context, IConfiguration configuration) : IUserService
{
    private readonly IConfiguration _configuration =
        configuration ?? throw new ArgumentNullException(nameof(configuration));
    public async Task<User> CreateUserAsync(string username, string email, string password)
    {
        if (await GetUserByNameAsync(username) != null || await GetUserByEmailAsync(email) != null)
        {
            throw new Exception("User already exists");
        }

        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = username,
            Email = email,
            Password = BC.HashPassword(password),
            Disabled = false,
            FileSystemObjects =
            [
                new FileSystemObject { Name = "root", IsFolder = true, Date = DateTime.UtcNow }
            ]
        };
        await context.Users.AddAsync(user);
        await context.SaveChangesAsync();

        return user;
    }

    public async Task<ResetToken> CreatePasswordResetTokenAsync(Guid userId, string token)
    {
        var userHasUnexpiredToken = await context.ResetTokens.AnyAsync(x => x.UserId == userId && x.ExpirationDate >= DateTime.UtcNow && x.TokenUsed == false);
        if (userHasUnexpiredToken) throw new Exception("Unable to create reset token");
        var resetToken = new ResetToken
        {
            UserId = userId,
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

    public List<Claim> GetUserClaims(User user)
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

    public string GeneratePasswordResetToken()
    {
        var randomNumber = new byte[32];
        using (var rng = RandomNumberGenerator.Create())
        {
            rng.GetBytes(randomNumber);
        }
        
        return Base64UrlEncoder.Encode(randomNumber);
    }

    public async Task<string> GenerateTwoFaSecretAsync(Guid userId)
    {
        var user = await context.Users.FirstOrDefaultAsync(x => x.Id == userId);
        if (user == null)
            throw new InvalidOperationException("User not found");
        
        var secretKey = KeyGeneration.GenerateRandomKey(20);
        var base32Secret = Base32Encoding.ToString(secretKey);
        
        user.TotpSecret = EncryptString(base32Secret, GetAesKey(), GetAesIv());
        await context.SaveChangesAsync();

        return base32Secret;
    }

    public async Task<bool> VerifyTotpCodeAsync(Guid userId, string code)
    {
        var user = await context.Users.FirstOrDefaultAsync(x => x.Id == userId);
        if (user == null) throw new InvalidOperationException("User not found");
        
        var decryptedSecret = DecryptString(user.TotpSecret, GetAesKey(), GetAesIv());
        var secretBytes = Base32Encoding.ToBytes(decryptedSecret);

        var totp = new Totp(secretBytes);
        return totp.VerifyTotp(code, out _, VerificationWindow.RfcSpecifiedNetworkDelay);
    }

    public async Task<bool> ToggleTwoFaAsync(Guid userId, string code)
    {
        var user = await context.Users.FirstOrDefaultAsync(x => x.Id == userId);
        if (user == null)
            throw new InvalidOperationException("User not found");
        
        var validCode = await VerifyTotpCodeAsync(userId, code);
        if (!validCode)
            throw new InvalidOperationException("Invalid code");

        user.TwoFaEnabled = !user.TwoFaEnabled;
        await context.SaveChangesAsync();
        return user.TwoFaEnabled;
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
    
    private static string EncryptString(string plainText, byte[] key, byte[] iv)
    {
        using var aes = Aes.Create();
        aes.Key = key;
        aes.IV = iv;

        var encryptor = aes.CreateEncryptor(aes.Key, aes.IV);
        using var ms = new MemoryStream();
        using (var cs = new CryptoStream(ms, encryptor, CryptoStreamMode.Write))
        using (var sw = new StreamWriter(cs))
        {
            sw.Write(plainText);
        }
        return Convert.ToBase64String(ms.ToArray());
    }

    private static string DecryptString(string cipherText, byte[] key, byte[] iv)
    {
        using var aes = Aes.Create();
        aes.Key = key;
        aes.IV = iv;

        var decryptor = aes.CreateDecryptor(aes.Key, aes.IV);
        using var ms = new MemoryStream(Convert.FromBase64String(cipherText));
        using var cs = new CryptoStream(ms, decryptor, CryptoStreamMode.Read);
        using var sr = new StreamReader(cs);
        return sr.ReadToEnd();
    }

    private byte[] GetAesKey()
    {
        var aesKeyBase64 = _configuration.AesKey();
        if (string.IsNullOrWhiteSpace(aesKeyBase64))
            throw new InvalidOperationException("AES key is missing from configuration.");
        
        try
        {
            return Convert.FromBase64String(aesKeyBase64);
        }
        catch (FormatException ex)
        {
            throw new InvalidOperationException("AES key is not a valid Base64 string.", ex);
        }
    }

    private byte[] GetAesIv()
    {
        var aesIvBase64 = _configuration.AesIv();
        if (string.IsNullOrWhiteSpace(aesIvBase64))
            throw new InvalidOperationException("AES IV is missing from configuration.");
        
        try
        {
            return Convert.FromBase64String(aesIvBase64);
        }
        catch (FormatException ex)
        {
            throw new InvalidOperationException("AES IV is not a valid Base64 string.", ex);
        }
    }
}