using CloudStorage.Extensions;
using BC = BCrypt.Net.BCrypt;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CloudStorage.Services;
using CloudStorage.Models;
using CloudStorage.ViewModels;

namespace CloudStorage.Controllers
{
    [AllowAnonymous]
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController(ITokenService tokenService, IUserService userService, IConfiguration configuration)
        : ControllerBase
    {
        private readonly ITokenService _tokenService = tokenService ?? throw new ArgumentNullException(nameof(tokenService));
        private readonly IUserService _userService = userService ?? throw new ArgumentNullException(nameof(userService));
        private readonly IConfiguration _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));

        [HttpPost, Route("login")]
        public async Task<IActionResult> LoginAsync([FromBody] User request)
        {
            if (request == null) return BadRequest("Invalid client request");

            var user = !string.IsNullOrWhiteSpace(request.Username)
                ? await _userService.GetUserByNameAsync(request.Username)
                : await _userService.GetUserByEmailAsync(request.Email);
            
            if (user == null || !BC.Verify(request.Password, user.Password))
                return BadRequest("Invalid user or password");
            if (user.Disabled)
                return BadRequest("Account is Disabled");
            
            var claims = _userService.GetUserClaims(user);
            var accessToken = _tokenService.GenerateAccessToken(claims);
            var refreshToken = _tokenService.GenerateRefreshToken();
            user.RefreshToken = refreshToken;
            user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);
            await _userService.UpdateUserAsync(user);

            return Ok(new TokenApiModel(accessToken, refreshToken));
        }

        [HttpPost, Route("register")]
        public async Task<IActionResult> RegisterAsync([FromBody] User user, [FromQuery] string inviteCode)
        {
            if (user == null || string.IsNullOrEmpty(user.Username) || string.IsNullOrEmpty(user.Email) ||
                !EmailHelper.EmailRegex.IsMatch(user.Email) || string.IsNullOrEmpty(user.Password))
            {
                return BadRequest("Invalid client request");
            }

            var inviteOnly = _configuration.InviteOnly();
            var isAdmin = string.Equals(user.Email, _configuration.AdminEmail(), StringComparison.OrdinalIgnoreCase);
            if (!isAdmin && inviteOnly)
            {
                var validInviteCode = await _userService.ValidateInviteCodeAsync(inviteCode, user.Email);
                if (!validInviteCode)
                    return BadRequest("Invalid invite code");
            }
            
            try
            {
                var token = await _userService.CreateUserAsync(user);
                return new JsonResult(token);
            }
            catch (Exception e)
            {
                return BadRequest(e.Message);
            }
        }

        [HttpPost("check-unique")]
        public async Task<bool> UniqueUsernameAsync([FromBody] User request)
        {
            return await _userService.GetUserByNameAsync(request.Username) == null && await _userService.GetUserByEmailAsync(request.Email) == null;
        }
    }
}
