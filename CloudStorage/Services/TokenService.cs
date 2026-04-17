using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using CloudStorage.Models;

namespace CloudStorage.Services;

public interface ITokenService
{
    string GenerateAccessToken(IEnumerable<Claim> claims, AccessTokenType tokenType);
    string GenerateRefreshToken();
    ClaimsPrincipal GetPrincipalFromExpiredToken(string token);
    ClaimsPrincipal ValidateTwoFaToken(string token);
}
public class TokenService(IConfiguration config) : ITokenService
{
    private readonly string _key = config.GetValue<string>("Jwt:Key");
    private readonly string _twoFaKey = config.GetValue<string>("Jwt:TwoFaKey");
    private readonly double _lifetimeSeconds = config.GetValue<double>("Jwt:Lifetime");
    private readonly string _issuer = config.GetValue<string>("Jwt:Issuer");

    public string GenerateAccessToken(IEnumerable<Claim> claims, AccessTokenType tokenType)
    {
        var key = tokenType  == AccessTokenType.Authentication ? _key : _twoFaKey;
        var secretKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddSeconds(_lifetimeSeconds),
            SigningCredentials = new SigningCredentials(secretKey, SecurityAlgorithms.HmacSha256),
            Issuer = _issuer,
            Audience = _issuer
        };
        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.CreateToken(tokenDescriptor);

        return tokenHandler.WriteToken(token);
    }

    public string GenerateRefreshToken()
    {
        var randomNumber = new byte[32];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomNumber);
        return Base64UrlEncoder.Encode(randomNumber);
    }

    public ClaimsPrincipal GetPrincipalFromExpiredToken(string token)
    {
        var tokenValidationParameters = new TokenValidationParameters
        {
            ValidateAudience = true,
            ValidAudience = _issuer,
            ValidateIssuer = true,
            ValidIssuer = _issuer,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_key)),
            ValidateLifetime = false
        };
        var tokenHandler = new JwtSecurityTokenHandler();
        tokenHandler.InboundClaimTypeMap.Clear(); 
        var principal = tokenHandler.ValidateToken(token, tokenValidationParameters, out var securityToken);
        if (securityToken is not JwtSecurityToken jwtSecurityToken || !jwtSecurityToken.Header.Alg.Equals(SecurityAlgorithms.HmacSha256, StringComparison.InvariantCultureIgnoreCase))
            throw new SecurityTokenException("Invalid token");
        return principal;
    }

    public ClaimsPrincipal ValidateTwoFaToken(string token)
    {
        var tokenValidationParameters = new TokenValidationParameters
        {
            ValidateAudience = true,
            ValidAudience = _issuer,
            ValidateIssuer = true,
            ValidIssuer = _issuer,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_twoFaKey)),
            ValidateLifetime = true,
        };
        var tokenHandler = new JwtSecurityTokenHandler();
        tokenHandler.InboundClaimTypeMap.Clear(); 
        var principal = tokenHandler.ValidateToken(token, tokenValidationParameters, out var securityToken);
        if (securityToken is not JwtSecurityToken jwtSecurityToken || !jwtSecurityToken.Header.Alg.Equals(SecurityAlgorithms.HmacSha256, StringComparison.InvariantCultureIgnoreCase))
            throw new SecurityTokenException("Invalid token");
            
        return principal;
    }
}