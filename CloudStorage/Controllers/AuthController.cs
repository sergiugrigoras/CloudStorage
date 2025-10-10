using System.Net.Mail;
using CloudStorage.Extensions;
using BC = BCrypt.Net.BCrypt;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CloudStorage.Services;
using CloudStorage.Models;

namespace CloudStorage.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController(ITokenService tokenService, IUserService userService, IConfiguration configuration, ICookieOptionsProvider cookieOptionsProvider, IMailService mailService)
        : ControllerBase
    {
        private readonly ITokenService _tokenService = tokenService ?? throw new ArgumentNullException(nameof(tokenService));
        private readonly IUserService _userService = userService ?? throw new ArgumentNullException(nameof(userService));
        private readonly IConfiguration _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
        private readonly ICookieOptionsProvider _cookieOptionsProvider = cookieOptionsProvider ?? throw new ArgumentNullException(nameof(cookieOptionsProvider));
        private readonly IMailService _mailService = mailService ?? throw new ArgumentNullException(nameof(mailService));
        
        [AllowAnonymous]
        [HttpPost("login")]
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
            
            Response.Cookies.Append(CookieNames.RefreshToken, refreshToken, _cookieOptionsProvider.GetOptions());

            return new JsonResult(new AccessToken(accessToken));
        }

        [AllowAnonymous]
        [HttpPost("register")]
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
                var newUser = await _userService.CreateUserAsync(user.Username, user.Email, user.Password);
                var claims = _userService.GetUserClaims(newUser);
                var accessToken = _tokenService.GenerateAccessToken(claims);
                var refreshToken = _tokenService.GenerateRefreshToken();
                newUser.RefreshToken = refreshToken;
                newUser.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);
                await _userService.UpdateUserAsync(newUser);
            
                Response.Cookies.Append(CookieNames.RefreshToken, refreshToken, _cookieOptionsProvider.GetOptions());

                return new JsonResult(new AccessToken(accessToken));
            }
            catch (Exception e)
            {
                return BadRequest(e.Message);
            }
        }
        
        [AllowAnonymous]
        [HttpPost("refresh")]
        public async Task<IActionResult> RefreshAsync([FromBody] AccessToken accessToken)
        {
            if (string.IsNullOrWhiteSpace(accessToken?.Token)) return BadRequest("Invalid Access Token");
            var refreshToken = Request.Cookies[CookieNames.RefreshToken];
            if (string.IsNullOrWhiteSpace(refreshToken)) return BadRequest("Invalid Refresh Token");
            try
            {
                var principal = _tokenService.GetPrincipalFromExpiredToken(accessToken.Token);
                var user = await _userService.GetUserAsync(principal);
                if (user == null)
                    return NotFound("User not found");
                if (user.RefreshToken != refreshToken)
                    return BadRequest("Invalid Refresh Token");
                if (user.RefreshTokenExpiryTime <= DateTime.UtcNow)
                    return BadRequest("Refresh Token is expired");
                if (user.Disabled)
                    return BadRequest("Account is Disabled");

                var newAccessToken = _tokenService.GenerateAccessToken(principal.Claims);
                var newRefreshToken = _tokenService.GenerateRefreshToken();
                user.RefreshToken = newRefreshToken;
                user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);
                await _userService.UpdateUserAsync(user);
        
                Response.Cookies.Append(CookieNames.RefreshToken, newRefreshToken, _cookieOptionsProvider.GetOptions());
                return new JsonResult(new AccessToken(newAccessToken));
            }
            catch (Exception e)
            {
                return StatusCode(500, e.Message);
            }
            
        }
        
        [AllowAnonymous]
        [HttpPost("check-unique")]
        public async Task<bool> UniqueUsernameAsync([FromBody] User request)
        {
            return await _userService.GetUserByNameAsync(request.Username) == null && await _userService.GetUserByEmailAsync(request.Email) == null;
        }
        
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePasswordAsync([FromBody] Password pass)
        {
            var user = await _userService.GetUserAsync(User);
            if (user == null) return Unauthorized();

            if (!BC.Verify(pass.OldPassword, user.Password)) return BadRequest("Invalid Password");
            user.Password = BC.HashPassword(pass.NewPassword);
            await _userService.UpdateUserAsync(user);
            return Ok();
        }
        
        [AllowAnonymous]
        [HttpPost, Route("forgot-password")]
        public async Task<IActionResult> ResetPasswordAsync([FromBody] User request)
        {
            if (request == null) return BadRequest("Invalid client request");
            var user = !string.IsNullOrWhiteSpace(request.Username)
                ? await _userService.GetUserByNameAsync(request.Username)
                : await _userService.GetUserByEmailAsync(request.Email);
            if (user == null) 
                return NotFound("Invalid user");
            if (user.Disabled)
                return BadRequest("Account is Disabled");
            
            var token = _userService.GeneratePasswordResetToken();
            try
            {
                var passwordResetToken = await _userService.CreatePasswordResetTokenAsync(user.Id, token);
            
                var resetLink =
                    $"{Request.Scheme}://{Request.Host}/password/reset?token={token}&id={passwordResetToken.Id}";
                var emailBody = EmailHelper.GeneratePasswordResetEmailBody(user.Username, resetLink);
                const string subject = EmailHelper.PasswordResetSubject;
                await _mailService.SendEmailAsync(new MailAddress(user.Email, user.Username), subject, emailBody);
                var hiddenEmail = EmailHelper.HideEmail(user.Email);
                return new JsonResult(hiddenEmail);
            }
            catch (Exception e)
            {
                return BadRequest(e.Message);
            }
            
        }
        
        [AllowAnonymous]
        [HttpPost, Route("reset-password")]
        public async Task<IActionResult> ResetPasswordAsync([FromBody] PasswordResetRequest request)
        {
            var resetToken = await _userService.GetResetTokenByIdAsync(request.TokenId);
            if (resetToken == null || resetToken.ExpirationDate <= DateTime.UtcNow || resetToken.TokenUsed || !BC.Verify(request.Token, resetToken.TokenHash))
                return BadRequest();
            
            var user = await _userService.GetUserByIdAsync(resetToken.UserId);
            if (user == null) 
                return NotFound("Invalid user");
            if (user.Disabled)
                return BadRequest("Account is Disabled");
            user.Password = BC.HashPassword(request.NewPassword);
            resetToken.TokenUsed = true;

            var claims = _userService.GetUserClaims(user);

            var accessToken = _tokenService.GenerateAccessToken(claims);
            var refreshToken = _tokenService.GenerateRefreshToken();

            user.RefreshToken = refreshToken;
            user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);
            await _userService.UpdateUserAsync(user);
            await _userService.UpdateResetTokenAsync(resetToken);
            
            Response.Cookies.Append(CookieNames.RefreshToken, refreshToken, _cookieOptionsProvider.GetOptions());
            return new JsonResult(new AccessToken(accessToken));
        }
        
        [HttpDelete("revoke")]
        public async Task<IActionResult> RevokeAsync()
        {
            var user = await _userService.GetUserAsync(User);
            if (user == null)
            {
                return BadRequest();
            }
            user.RefreshToken = null;
            user.RefreshTokenExpiryTime = null;
            await _userService.UpdateUserAsync(user);
            return Ok();
        }
    }
}
