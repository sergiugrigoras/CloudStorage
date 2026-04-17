
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace CloudStorage.Models;

public class User
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; }

    public string Name { get; set; }

    public string PasswordHash { get; set; }

    public string Email { get; set; }

    public bool TwoFaEnabled { get; set; }

    public string TotpSecret { get; set; }

    public string RefreshToken { get; set; }

    public DateTime? RefreshTokenExpiryTime { get; set; }

    public bool Disabled { get; set; }

    public DateTime? LastActive { get; set; }

    public PendingResetToken PasswordResetToken { get; set; }
}

public class PendingResetToken
{
    public string TokenHash { get; set; }

    public DateTime ExpiresAt { get; set; }
}

public class CreateUserRequest
{
    public string Name { get; set; }
    public string Email { get; set; }
    public string Password { get; set; }
    
}

public class AccessToken(string token, AccessTokenType tokenType)
{
    public string Token { get; set; } = token;
    public AccessTokenType TokenType { get; set; } = tokenType;
}

public enum AccessTokenType
{
    Authentication = 1,
    TwoFactorAuthentication = 2
}

public class ChangePasswordRequest
{
    public string OldPassword { get; set; }
    public string NewPassword { get; set; }
}

public class ForgotPasswordRequest
{
    public string Email { get; set; }
}

public class PasswordResetRequest
{
    public string Email { get; set; }
    public string Token { get; set; }
    public string NewPassword { get; set; }
}

public class TwoFaRequest
{
    public string Password { get; set; }
    public string Code { get; set; }
}

public class LoginRequest
{
    public string Email { get; set; }
    public string Password { get; set; }
}

public class TwoFaLogin
{
    public string Token { get; set; }
    public string Code { get; set; }
}

public static class AppClaims
{
    public const string ClientId = "clientId";
    public const string Role = "role";
}

public record TokenResult(string AccessToken, string RefreshToken);

public record TotpSetupResult(string SecretKey, string Email);

public static class Roles
{
    public const string Admin = "Admin";
    public const string User = "User";
}