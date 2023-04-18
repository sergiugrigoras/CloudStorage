using BC = BCrypt.Net.BCrypt;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Security.Principal;
using System.Threading.Tasks;
using System.Security.Cryptography;
using CloudStorage.Models;

namespace CloudStorage.Services
{
    public interface IUserService
    {
        Task<User> GetUserFromPrincipalAsync(ClaimsPrincipal principal);
        Task<User> GetUserByNameAsync(string name);
        Task<User> GetUserByEmailAsync(string email);
        Task<User> GetUserByIdAsync(Guid id);
        Task UpdateUserAsync(User user);
        Task CreateUserAsync(User user);
        List<Claim> GetUserClaims(User user);
        Task<ResetToken> CreateResetTokenAsync(User user, string token);
        Task<ResetToken> GetResetTokenByIdAsync(int id);
        Task UpdateResetTokenAsync(ResetToken ResetToken);

        string GenerateToken();
    }

    public class UserService : IUserService
    {
        private readonly AppDbContext _context;
        public UserService(AppDbContext context)
        {
            _context = context;
        }

        public async Task CreateUserAsync(User user)
        {
            await _context.Users.AddAsync(user);
            await _context.SaveChangesAsync();
        }

        public async Task<ResetToken> CreateResetTokenAsync(User user, string token)
        {
            var ResetToken = new ResetToken();
            ResetToken.UserId = user.Id;
            ResetToken.TokenHash = BC.HashPassword(token);
            ResetToken.ExpirationDate = DateTime.Now.AddHours(1);

            await _context.ResetTokens.AddAsync(ResetToken);
            await _context.SaveChangesAsync();
            return ResetToken;
        }

        public async Task<User> GetUserByEmailAsync(string email)
        {
            if (email == null)
            {
                return null;
            }
            var user = await _context.Users.FirstOrDefaultAsync(x => x.Email.ToLower() == email.ToLower());
            return user;
        }

        public async Task<User> GetUserByNameAsync(string name)
        {
            if (name == null)
            {
                return null;
            }
            var user = await _context.Users.FirstOrDefaultAsync(x => x.Username.ToLower() == name.ToLower());
            return user;
        }

        public List<Claim> GetUserClaims(User user)
        {
            if (user != null)
            {
                return new List<Claim>
                {
                        new Claim(ClaimTypes.Name, user.Username),
                        new Claim(JwtRegisteredClaimNames.Email,user.Email),
                        new Claim(JwtRegisteredClaimNames.Jti,user.Id.ToString()),
                };
            }
            else
                return null;

        }

        public async Task<User> GetUserFromPrincipalAsync(ClaimsPrincipal principal)
        {
            if (principal.FindFirst(JwtRegisteredClaimNames.Jti) == null)
            {
                return null;
            }
            else
            {
                var id = principal.FindFirst(JwtRegisteredClaimNames.Jti).Value;
                if (Guid.TryParse(id, out Guid userId))
                {
                    var user = await _context.Users.FindAsync(userId);
                    return user;
                }
                return null;
            }

        }

        public async Task UpdateUserAsync(User user)
        {
            _context.Users.Update(user);
            await _context.SaveChangesAsync();
        }

        public string GenerateToken()
        {
            var randomNumber = new byte[64];
            using (var rng = RandomNumberGenerator.Create())
            {
                rng.GetBytes(randomNumber);
            }
            var token = Convert.ToBase64String(randomNumber).TrimEnd('=').Replace('+', '-').Replace('/', '_');
            return token;
        }

        public async Task<ResetToken> GetResetTokenByIdAsync(int id)
        {
            var ResetToken = await _context.ResetTokens.FindAsync(id);
            return ResetToken;
        }

        public async Task<User> GetUserByIdAsync(Guid id)
        {
            var user = await _context.Users.FindAsync(id);
            return user;
        }

        public async Task UpdateResetTokenAsync(ResetToken ResetToken)
        {
            _context.ResetTokens.Update(ResetToken);
            await _context.SaveChangesAsync();
        }
    }
}
