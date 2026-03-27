using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace CloudStorage.Models;

public class User
{
    public Guid Id { get; set; }

    public string Username { get; set; }

    public string Password { get; set; }

    public string Email { get; set; }
    public bool TwoFaEnabled { get; set; }
    public string TotpSecret { get; set; }
    
    private string _refreshToken;
    public string RefreshToken {
        get => _refreshToken;
        set
        {
            _refreshToken = value;
            LastActive = DateTime.UtcNow;
        }
    }

    public DateTime? RefreshTokenExpiryTime { get; set; }
    public bool Disabled { get; set; }
    public DateTime? LastActive { get; set; }

    public virtual ICollection<FileSystemObject> FileSystemObjects { get; set; } = [];
    
    public virtual ICollection<ResetToken> ResetTokens { get; } = [];

    public virtual ICollection<MediaObject> MediaObjects { get; set; } = [];
    public virtual ICollection<MediaAlbumLegacy> MediaAlbums { get; set; } = [];
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
public class PasswordResetRequest
{
    public int TokenId { get; set; }
    public string Token { get; set; }
    public string NewPassword { get; set; }
}

public class TwoFaRequest
{
    public string Password { get; set; }
    public string Code { get; set; }
}

public class TwoFaLogin
{
    public string Token { get; set; }
    public string Code { get; set; }
}

public static class AppClaims
{
    public const string ClientId = "clientId";
}