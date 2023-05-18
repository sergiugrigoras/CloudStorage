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

        public void RemoveKeyForUser(Guid userId)
        {
            UserKeys.Remove(userId);
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
            var key = new string(Enumerable.Repeat(chars, length).Select(s => s[random.Next(s.Length)]).ToArray());
            return key;
        }

    }

    public class AuthorizationKeys
    {
        private Key _currentKey { get; set; }
        private Key _previousKey { get; set; }

        public AuthorizationKeys AddKey(string keyValue)
        {
            _previousKey = _currentKey;
            _currentKey = new Key(keyValue);
            return this;
        }

        public bool Validate(string key)
        {
            return _currentKey.IsValid(key) || _previousKey.IsValid(key);
        }

    }

    public class Key
    {
        private string _value;
        private DateTime _expirationDate;
        public Key(string keyValue) 
        {
            _value = keyValue;
            _expirationDate = DateTime.Now.AddMinutes(2);
        }

        public bool IsValid(string key)
        { 
            return _value.Equals(key) && _expirationDate > DateTime.Now;
        }
    }
}
