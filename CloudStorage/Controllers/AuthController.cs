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
    public class AuthController : ControllerBase
    {
        private readonly ITokenService _tokenService;
        private readonly IUserService _userService;
        private readonly IFsoService _fsoService;
        private readonly IConfiguration _configuration;

        public AuthController(ITokenService tokenService, IUserService userService, IFsoService fsoService, IConfiguration configuration)
        {
            _tokenService = tokenService ?? throw new ArgumentNullException(nameof(tokenService));
            _userService = userService ?? throw new ArgumentNullException(nameof(userService));
            _fsoService = fsoService ?? throw new ArgumentNullException(nameof(fsoService));
            _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
        }

        [HttpPost, Route("login")]
        public async Task<IActionResult> LoginAsync([FromBody] User request)
        {
            if (request == null)
            {
                return BadRequest("Invalid client request");
            }

            User user;
            if (request.Username != "")
            {
                user = await _userService.GetUserByNameAsync(request.Username);
            }
            else
            {
                user = await _userService.GetUserByEmailAsync(request.Email);
            }

            if (user == null || !BC.Verify(request.Password, user.Password))
            {
                return NotFound();
            }

            var claims = _userService.GetUserClaims(user);

            var accessToken = _tokenService.GenerateAccessToken(claims);
            var refreshToken = _tokenService.GenerateRefreshToken();
            user.RefreshToken = refreshToken;
            user.RefreshTokenExpiryTime = DateTime.Now.AddDays(7);
            await _userService.UpdateUserAsync(user);

            return Ok(new TokenApiModel(accessToken, refreshToken));
        }

        [HttpPost, Route("register")]
        public async Task<IActionResult> RegisterAsync([FromBody] User user, [FromQuery] string inviteCode)
        {
            if (user == null || string.IsNullOrEmpty(user.Username) || string.IsNullOrEmpty(user.Email) || string.IsNullOrEmpty(user.Password))
            {
                return BadRequest("Invalid client request");
            }
            
            var inviteOnly = _configuration.GetValue<bool?>("Registration:InviteOnly");
            if (inviteOnly.HasValue && inviteOnly.Value)
            {
                var validInviteCode = await _userService.ValidateInviteCodeAsync(inviteCode);
                if (!validInviteCode)
                    return BadRequest("Invalid invite code");
            }

            if (await _userService.GetUserByNameAsync(user.Username) != null || await _userService.GetUserByEmailAsync(user.Email) != null)
            {
                return BadRequest("Invalid client request, not unique");
            }

            user.Id = Guid.NewGuid();
            var claims = _userService.GetUserClaims(user);
            var accessToken = _tokenService.GenerateAccessToken(claims);
            var refreshToken = _tokenService.GenerateRefreshToken();
            var hashPassword = BC.HashPassword(user.Password);

            user.Password = hashPassword;
            user.RefreshToken = refreshToken;
            user.RefreshTokenExpiryTime = DateTime.Now.AddDays(7);

            await _userService.CreateUserAsync(user);
            FileSystemObjectViewModel model = new()
            {
                Name = "root",
                IsFolder = true,
                OwnerId = user.Id
            };
            await _fsoService.CreateAsync(model);

            var token = new TokenApiModel(accessToken, refreshToken);
            return new JsonResult(token);
        }

        [HttpPost("check-unique")]
        public async Task<bool> UniqueUsernameAsync([FromBody] User request)
        {
            return await _userService.GetUserByNameAsync(request.Username) == null && await _userService.GetUserByEmailAsync(request.Email) == null;
        }
    }
}
