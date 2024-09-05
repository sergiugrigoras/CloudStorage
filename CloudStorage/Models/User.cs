namespace CloudStorage.Models;

public class User
{
    public Guid Id { get; set; }

    public string Username { get; set; }

    public string Password { get; set; }

    public string Email { get; set; }

    public string RefreshToken { get; set; }

    public DateTime? RefreshTokenExpiryTime { get; set; }

    public virtual ICollection<FileSystemObject> FileSystemObjects { get; } = [];

    public virtual ICollection<Note> Notes { get; } = [];

    public virtual ICollection<ResetToken> ResetTokens { get; } = [];

    public virtual ICollection<MediaObject> MediaObjects { get; set; } = [];
    public virtual ICollection<MediaAlbum> MediaAlbums { get; set; } = [];
    public ICollection<Expense> Expenses { get; set; } = [];
    public ICollection<PaymentMethod> PaymentMethods { get; set; } = [];
}

public class TokenApiModel
{
    public string AccessToken { get; set; }
    public string RefreshToken { get; set; }

    public TokenApiModel()
    {
    }
    public TokenApiModel(string accessToken, string refreshToken)
    {
        AccessToken = accessToken;
        RefreshToken = refreshToken;
    }
}

public class Password
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