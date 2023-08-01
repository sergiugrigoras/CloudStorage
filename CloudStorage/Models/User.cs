using CloudStorage.Models;
using System;
using System.Collections.Generic;

namespace CloudStorage.Models
{
    public partial class User
    {
        public Guid Id { get; set; }

        public string Username { get; set; }

        public string Password { get; set; }

        public string Email { get; set; }

        public string RefreshToken { get; set; }

        public DateTime? RefreshTokenExpiryTime { get; set; }

        public virtual ICollection<FileSystemObject> FileSystemObjects { get; } = new List<FileSystemObject>();

        public virtual ICollection<Note> Notes { get; } = new List<Note>();

        public virtual ICollection<ResetToken> ResetTokens { get; } = new List<ResetToken>();

        public virtual ICollection<Share> Shares { get; } = new List<Share>();
        public virtual ICollection<MediaObject> MediaObjects { get; set; } = new List<MediaObject>();
        public virtual ICollection<MediaAlbum> MediaAlbums { get; set; } = new List<MediaAlbum>();
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
}
