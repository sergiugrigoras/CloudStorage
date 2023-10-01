namespace CloudStorage.Services
{
    public class ContentAuthorization
    {
        private Dictionary<Guid, AuthorizationKeys> UserKeys { get; set; }
        private readonly ReaderWriterLockSlim dictLock = new();
        public ContentAuthorization() 
        {
            UserKeys = new Dictionary<Guid, AuthorizationKeys>();
        }
        public string GenerateKeyForUser(Guid userId)
        {
            var key = GenerateKey();

            dictLock.EnterWriteLock();
            var authKeys = GetAuthorizationKeysForUser(userId);
            if (authKeys != null)
            {
                try
                {
                    authKeys.AddKey(key);
                }
                finally
                {
                    dictLock.ExitWriteLock();
                }
            }
            else
            {
                try
                {
                    UserKeys.Add(userId, new AuthorizationKeys().AddKey(key));
                }
                finally
                {
                    dictLock.ExitWriteLock();
                }
            }

            return key;
        }

        public void RemoveKeyForUser(Guid userId)
        {
            dictLock.EnterWriteLock();
            try
            {
                UserKeys.Remove(userId);
            }
            finally
            {
                dictLock.ExitWriteLock();
            }
        }

        public bool ValidKey(Guid userId, string key)
        {
            if (string.IsNullOrWhiteSpace(key)) return false;
            dictLock.EnterReadLock();
            try
            {
                var authKeys = GetAuthorizationKeysForUser(userId);
                if (authKeys == null)
                    return false;

                return authKeys.Validate(key);
            }
            finally
            {
                dictLock.ExitReadLock();
            }
        }

        private AuthorizationKeys GetAuthorizationKeysForUser(Guid userId) 
        {
            if (UserKeys.TryGetValue(userId, out var keys))
                return keys;

            return null;
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
        private Key CurrentKey { get; set; }
        private Key PreviousKey { get; set; }

        public AuthorizationKeys AddKey(string keyValue)
        {
            PreviousKey = CurrentKey;
            CurrentKey = new Key(keyValue);
            PreviousKey ??= CurrentKey;
            return this;
        }

        public bool Validate(string key)
        {
            return CurrentKey.IsValid(key) || PreviousKey.IsValid(key);
        }

    }

    public class Key
    {
        private readonly string _value;
        private readonly DateTime _expirationDate;
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
