using Microsoft.IdentityModel.Tokens;
using System.Diagnostics;

namespace CloudStorage.Services
{
    public class ContentAuthorization
    {
        private Dictionary<Guid, AuthorizationKeys> UserKeys { get; set; }
        public ContentAuthorization() 
        {
            UserKeys = new Dictionary<Guid, AuthorizationKeys>();
        }
        public string GenerateKeyForUser(Guid userId)
        {
            var key = GenerateKey();

            if (UserKeys.TryGetValue(userId, out var keys))
            {
                keys.AddKey(key);
            }
            else
            { 
                UserKeys.Add(userId, new AuthorizationKeys().AddKey(key));
            }

            return key;
        }

        public bool ValidKey(Guid userId, string key)
        {
            if (string.IsNullOrWhiteSpace(key)) return false;
            var containsKey = UserKeys.TryGetValue(userId, out var keys);
            return containsKey && keys.Validate(key);
        }

        private static string GenerateKey()
        {
            const string chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
            const int length = 64;
            var random = new Random();
            var key = new string(Enumerable.Repeat(chars, length)
                                                    .Select(s => s[random.Next(s.Length)]).ToArray());
            return key;
        }

    }

    public class AuthorizationKeys
    {
        public string CurrentKey { get; set; }
        public string PreviousKey { get; set; }

        public AuthorizationKeys AddKey(string key)
        {
            PreviousKey = CurrentKey;
            CurrentKey = key;
            return this;
        }

        public bool Validate(string key)
        {
            return CurrentKey == key || PreviousKey == key;
        }

    }
}
