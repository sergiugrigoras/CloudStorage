using System.Collections.Concurrent;

namespace CloudStorage.Services;

public class ContentAuthorization
{
    private ConcurrentDictionary<string, AuthorizationKeys> UserKeys { get; } = new();

    public string GenerateKeyForUser(string userId)
    {
        var key = GenerateKey();
        
        var authKeys = GetAuthorizationKeysForUser(userId);
        if (authKeys != null)
        {
            authKeys.PushKey(key);
        }
        else
        {
            UserKeys.TryAdd(userId, new AuthorizationKeys().PushKey(key));
        }

        return key;
    }

    public void RemoveKeyForUser(string userId)
    {
        UserKeys.Remove(userId,  out _);
    }

    public bool ValidKey(string userId, string key)
    {
        if (string.IsNullOrWhiteSpace(key)) return false;
        var authKeys = GetAuthorizationKeysForUser(userId);
        return authKeys != null && authKeys.Validate(key);
    }

    private AuthorizationKeys GetAuthorizationKeysForUser(string userId)
    {
        return UserKeys.TryGetValue(userId, out var keys) ? keys : null;
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

    public AuthorizationKeys PushKey(string keyValue)
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

public class Key(string keyValue)
{
    private readonly DateTime _expirationDate = DateTime.Now.AddMinutes(2);

    public bool IsValid(string key)
    { 
        return keyValue.Equals(key) && _expirationDate > DateTime.Now;
    }
}