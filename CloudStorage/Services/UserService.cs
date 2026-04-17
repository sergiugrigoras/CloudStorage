using BC = BCrypt.Net.BCrypt;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Authentication;
using System.Security.Claims;
using System.Security.Cryptography;
using CloudStorage.Exceptions;
using CloudStorage.Extensions;
using CloudStorage.Models;
using CloudStorage.Repositories.User;
using Microsoft.IdentityModel.Tokens;
using MongoDB.Driver;
using OtpNet;

namespace CloudStorage.Services;

public interface IUserService
{
    // -------------------------
    // Authentication
    // -------------------------
    Task<User> AuthenticateAsync(string email, string password);
    Task<User> ValidateTwoFactorLoginAsync(string token, string code);
    Task<TokenResult> GenerateAccessTokenAsync(User user, AccessTokenType tokenType);
    Task<User> GetUserFromExpiredTokenAsync(string expiredToken, string refreshToken);
    Task ClearRefreshTokenAsync(string expiredToken, string refreshToken);

    // -------------------------
    // User Management
    // -------------------------
    Task<User> CreateUserAsync(string name, string email, string password);
    Task<User> SetUserDisabledAsync(string userId, bool disabled);
    Task<List<User>> GetAllUsersAsync();

    // -------------------------
    // Password Management
    // -------------------------
    Task<string> CreatePasswordResetTokenForUserAsync(string email);
    Task<User> ResetPasswordWithTokenAsync(string email, string tokenValue, string newPassword);
    Task ChangePasswordAsync(string oldPassword, string newPassword);

    // -------------------------
    // Two-Factor Authentication
    // -------------------------
    Task<TotpSetupResult> GenerateTwoFaSecretAsync();
    Task<bool> ToggleTwoFaAsync(string password, string code);
    Task<bool> IsTwoFactorEnabledAsync();

    // -------------------------
    // Invitations
    // -------------------------
    Task<string> CreateInviteCodeAsync(string email);
    Task<bool> ValidateInviteCodeAsync(string code, string email);
}

public class UserService(IClientIdAccessor clientIdAccessor,ICurrentUser currentUser, IConfiguration configuration, IUserRepository userRepository, IInviteRepository inviteRepository, ITokenService tokenService) : IUserService
{
    private readonly IClientIdAccessor _clientIdAccessor =
        clientIdAccessor ?? throw new ArgumentNullException(nameof(clientIdAccessor));
    
    private readonly ICurrentUser _currentUser = 
        currentUser ?? throw new ArgumentNullException(nameof(currentUser));
    
    private readonly IConfiguration _configuration =
        configuration ?? throw new ArgumentNullException(nameof(configuration));
    
    private readonly IUserRepository _userRepository =
        userRepository ?? throw new ArgumentNullException(nameof(userRepository));
    
    private readonly IInviteRepository _inviteRepository =
        inviteRepository ?? throw new ArgumentNullException(nameof(inviteRepository));
    
    private readonly ITokenService _tokenService =
        tokenService ?? throw new ArgumentNullException(nameof(tokenService));
    
    public async Task<User> CreateUserAsync(string name, string email, string password)
    {
        try
        {
            var user = new User
            {
                Name = name.Trim(),
                Email = email.ToLower().Trim(),
                PasswordHash = BC.HashPassword(password),
                Disabled = false,
            };

            await _userRepository.CreateAsync(user);
            return user;
        }
        catch (MongoWriteException ex) when (ex.WriteError.Category == ServerErrorCategory.DuplicateKey)
        {
            throw new DuplicateUserException("Email is already registered");
        }
    }

    public async Task ClearRefreshTokenAsync(string expiredToken, string refreshToken)
    {
        var user = await GetUserFromExpiredTokenAsync(expiredToken, refreshToken);
        await _userRepository.UpdateRefreshTokenAsync(user.Id, null, null);
    }

    public async Task<string> CreatePasswordResetTokenForUserAsync(string email)
    {
        email = email?.Trim();
        var token = GeneratePasswordResetToken();
        var resetToken = new PendingResetToken
        {
            TokenHash = BC.HashPassword(token),
            ExpiresAt = DateTime.UtcNow.AddMinutes(15)
        };
        
        await _userRepository.UpdatePasswordResetTokenAsync(email, resetToken);
        return token;
    }


    private Task<User> GetCurrentUserAsync() =>
        _userRepository.GetOneByIdAsync(_currentUser.UserId);

    private Task<User> GetUserByEmailAsync(string email) =>
        string.IsNullOrWhiteSpace(email) ? null : _userRepository.GetOneByEmailAsync(email.Trim());

    private List<Claim> BuildUserClaims(User user)
    {
        ArgumentNullException.ThrowIfNull(user);   
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Name, user.Name),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(JwtRegisteredClaimNames.Sub, user.Id),
        };
        var isAdmin = string.Equals(user.Email, _configuration.AdminEmail(), StringComparison.OrdinalIgnoreCase);
        claims.Add(new Claim(AppClaims.Role, isAdmin ? Roles.Admin : Roles.User));
        return claims;
    }

    private Task<User> GetUserFromPrincipalAsync(ClaimsPrincipal principal)
    {
        var claim = principal.FindFirstValue(JwtRegisteredClaimNames.Sub);
        return _userRepository.GetOneByIdAsync(claim);
    }

    public async Task<User> AuthenticateAsync(string email, string password)
    {
        var user = await _userRepository.GetOneByEmailAsync(email);
        
        if (user == null || !BC.Verify(password, user.PasswordHash))
            throw new AuthenticationException("Invalid user or password");
        
        if (user.Disabled)
            throw new AuthenticationException("Account is Disabled");
        
        return user;
    }

    public async Task<User> ValidateTwoFactorLoginAsync(string token, string code)
    {
        var clientId = _clientIdAccessor.ClientId;
        
        var principal = _tokenService.ValidateTwoFaToken(token);

        var user = await GetUserFromPrincipalAsync(principal);
        
        if (user == null)
            throw new InvalidOperationException("User not found");
        
        var claimClientId = principal.FindFirst(AppClaims.ClientId)?.Value;
        if (claimClientId == null ||
            !string.Equals(claimClientId, clientId, StringComparison.OrdinalIgnoreCase))
            throw new SecurityTokenException("Token was not issued for this client.");
        
        if (!VerifyTotpCode(user.TotpSecret, code))
            throw new UnauthorizedAccessException("Invalid TOTP code.");

        return user;
    }

    public async Task<User> SetUserDisabledAsync(string userId, bool disabled)
    {
        var currentUser = await GetCurrentUserAsync();
        if (currentUser.Id == userId)
            throw new InvalidOperationException("Cannot disable your own account");

        return await _userRepository.UpdateDisabledAsync(userId, disabled);
    }

    public async Task<bool> ValidateInviteCodeAsync(string code, string email)
    {
        if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(email)) 
            return false;

        email = email.Trim();
        var inviteCode = await _inviteRepository.GetOneByEmailAsync(email);
        if (inviteCode == null || !BC.Verify(code.ToUpper(), inviteCode.CodeHash))
            return false;
        
        await _inviteRepository.UpdateDateAsync(email, DateTime.UtcNow);
        return true;
    }

    public async Task<string> CreateInviteCodeAsync(string email)
    {
        email = email.Trim();
        var user = await GetUserByEmailAsync(email);
        if (user != null)
            throw new InvalidOperationException("Email is already registered.");

        var code = GenerateInviteCode(6);
        var codeHash = BC.HashPassword(code);
    
        var existingInvite = await _inviteRepository.GetOneByEmailAsync(email);
        if (existingInvite != null)
            await _inviteRepository.UpdateCodeAsync(email, codeHash);
        else
            await _inviteRepository.CreateAsync(new Invite
            {
                Email = email,
                CodeHash = codeHash,
                Date = null
            });
    
        return code;
    }
    
    public Task<List<User>> GetAllUsersAsync() => _userRepository.GetUserListAsync();

    private string GeneratePasswordResetToken()
    {
        var randomNumber = new byte[32];
        using (var rng = RandomNumberGenerator.Create())
        {
            rng.GetBytes(randomNumber);
        }
        
        return Base64UrlEncoder.Encode(randomNumber);
    }

    public async Task<TotpSetupResult> GenerateTwoFaSecretAsync()
    {
        var user = await GetCurrentUserAsync();
        if (user == null)
            throw new InvalidOperationException("User not found");
        if (user.TwoFaEnabled)
            throw new InvalidOperationException("Two-Factor Authentication Enabled");
        
        var secretKey = KeyGeneration.GenerateRandomKey(20);
        var base32Secret = Base32Encoding.ToString(secretKey);
        
        var totpSecret = EncryptString(base32Secret, GetAesKey(), GetAesIv());
        await _userRepository.UpdateTotpSecretAsync(user.Id, totpSecret);
        
        return new TotpSetupResult(base32Secret, user.Email);
    }

    private bool VerifyTotpCode(string totpSecret, string code)
    {
        var decryptedSecret = DecryptString(totpSecret, GetAesKey(), GetAesIv());
        var secretBytes = Base32Encoding.ToBytes(decryptedSecret);

        var totp = new Totp(secretBytes);
        return totp.VerifyTotp(code, out _, VerificationWindow.RfcSpecifiedNetworkDelay);
    }

    public async Task<bool> ToggleTwoFaAsync(string password, string code)
    {
        var user = await GetCurrentUserAsync();
        
        if (user == null)
            throw new InvalidOperationException("User not found");
        
        if (!BC.Verify(password, user.PasswordHash))
            throw new UnauthorizedAccessException("Invalid password.");
        
        if (!VerifyTotpCode(user.TotpSecret, code))
            throw new UnauthorizedAccessException("Invalid code");

        var newState = !user.TwoFaEnabled;
        await _userRepository.UpdateTwoFaAsync(user.Id, newState);
    
        return newState;
    }

    public async Task<bool> IsTwoFactorEnabledAsync()
    {
        var user = await GetCurrentUserAsync();
        
        if (user == null)
            throw new InvalidOperationException("User not found");
        
        return user.TwoFaEnabled;
    }

    public async Task<TokenResult> GenerateAccessTokenAsync(User user, AccessTokenType tokenType)
    {
        var claims = BuildUserClaims(user);
        string refreshToken = null;

        if (tokenType == AccessTokenType.Authentication)
        {
            refreshToken = _tokenService.GenerateRefreshToken();
            var utcNow = DateTime.UtcNow;
            await _userRepository.UpdateRefreshTokenAsync(user.Id, refreshToken, utcNow.AddDays(7));
            await _userRepository.UpdateLastActiveAsync(user.Id, utcNow);
        }
        else if (tokenType == AccessTokenType.TwoFactorAuthentication)
        {
            var clientId = _clientIdAccessor.ClientId ?? throw new InvalidOperationException("Client ID is missing.");
            claims.Add(new Claim(AppClaims.ClientId, clientId));
        }

        var token = _tokenService.GenerateAccessToken(claims, tokenType);
        return new TokenResult(token, refreshToken);
    }

    public async Task<User> GetUserFromExpiredTokenAsync(string expiredToken, string refreshToken)
    {
        var principal = _tokenService.GetPrincipalFromExpiredToken(expiredToken); // throws SecurityTokenException
        var user = await GetUserFromPrincipalAsync(principal);
        if (user == null)
            throw new InvalidOperationException("User not found");
        if (user.RefreshToken != refreshToken)
            throw new InvalidRefreshTokenException("Invalid refresh token.");
        if (user.RefreshTokenExpiryTime <= DateTime.UtcNow)
            throw new InvalidRefreshTokenException("Refresh token has expired.");
        if (user.Disabled)
            throw new UnauthorizedAccessException("Account is disabled.");
        
        return user;
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

    public async Task<User> ResetPasswordWithTokenAsync(string email, string tokenValue, string newPassword)
    {
        if (string.IsNullOrEmpty(newPassword))
            throw new ArgumentException("New password cannot be empty.");
    
        var user = await _userRepository.GetOneByEmailAsync(email);
        if (user == null || !ValidPasswordResetToken(user.PasswordResetToken, tokenValue))
            throw new InvalidOperationException("Invalid or expired reset token.");
        if (user.Disabled)
            throw new UnauthorizedAccessException("Account is disabled.");

        return await _userRepository.UpdatePasswordAndResetTokenAsync(user.Id, BC.HashPassword(newPassword));
    }

    private static bool ValidPasswordResetToken(PendingResetToken pendingResetToken, string tokenValue) =>
        pendingResetToken != null &&
        pendingResetToken.ExpiresAt > DateTime.UtcNow &&
        BC.Verify(tokenValue, pendingResetToken.TokenHash);
    
    public async Task ChangePasswordAsync(string oldPassword, string newPassword)
    {
        if (string.IsNullOrEmpty(newPassword))
            throw new ArgumentException("New password cannot be empty.");

        var user = await GetCurrentUserAsync();
        if (user == null)
            throw new InvalidOperationException("User not found.");
    
        if (!BC.Verify(oldPassword, user.PasswordHash))
            throw new UnauthorizedAccessException("Invalid password.");
    
        await _userRepository.UpdatePasswordAndResetTokenAsync(user.Id, BC.HashPassword(newPassword));
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