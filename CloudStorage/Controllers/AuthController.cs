using System.Net.Mail;
using System.Security.Authentication;
using CloudStorage.Exceptions;
using CloudStorage.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CloudStorage.Services;
using CloudStorage.Models;
using Microsoft.IdentityModel.Tokens;

namespace CloudStorage.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController(IUserService userService, IConfiguration configuration, ICookieOptionsProvider cookieOptionsProvider, IMailService mailService)
        : ControllerBase
    {
        private readonly IUserService _userService = userService ?? throw new ArgumentNullException(nameof(userService));
        private readonly IConfiguration _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
        private readonly ICookieOptionsProvider _cookieOptionsProvider = cookieOptionsProvider ?? throw new ArgumentNullException(nameof(cookieOptionsProvider));
        private readonly IMailService _mailService = mailService ?? throw new ArgumentNullException(nameof(mailService));
        
        [AllowAnonymous]
        [HttpPost("login")]
        public async Task<IActionResult> LoginAsync([FromBody] LoginRequest request)
        {
            if (request == null) return BadRequest("Invalid client request");

            try
            {
                var user = await _userService.AuthenticateAsync(request.Email, request.Password);
                return user.TwoFaEnabled ? await SendTwoFactorAuthenticationTokenAsync(user) : await SendAuthenticationTokenAsync(user);
            }
            catch (AuthenticationException e)
            {
                return BadRequest(e.Message);
            }
            catch
            {
                return StatusCode(500, "An unexpected error occurred.");
            }
        }
        
        [AllowAnonymous]
        [HttpPost("login-2fa")]
        public async Task<IActionResult> LoginTwoFaAsync([FromBody] TwoFaLogin request)
        {
            if (request == null) return BadRequest("Invalid client request");

            try
            {
                var user = await _userService.ValidateTwoFactorLoginAsync(request.Token, request.Code);
                return await SendAuthenticationTokenAsync(user);
            }
            catch (SecurityTokenException e)
            {
                return Unauthorized(e.Message);
            }
            catch (UnauthorizedAccessException e)
            {
                return Unauthorized(e.Message);
            }
            catch (InvalidOperationException e)
            {
                return BadRequest(e.Message);
            }
            catch (Exception)
            {
                return StatusCode(500, "An unexpected error occurred.");
            }
        }
        
        [AllowAnonymous]
        [HttpPost("register")]
        public async Task<IActionResult> RegisterAsync([FromBody] CreateUserRequest request, [FromQuery] string inviteCode)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrEmpty(request.Email) ||
                !EmailHelper.EmailRegex.IsMatch(request.Email) || string.IsNullOrEmpty(request.Password))
            {
                return BadRequest("Invalid client request");
            }

            var inviteOnly = _configuration.InviteOnly();
            var isAdmin = string.Equals(request.Email, _configuration.AdminEmail(), StringComparison.OrdinalIgnoreCase);
            if (!isAdmin && inviteOnly)
            {
                var validInviteCode = await _userService.ValidateInviteCodeAsync(inviteCode, request.Email);
                if (!validInviteCode)
                    return BadRequest("Invalid invite code");
            }

            try
            {
                var user = await _userService.CreateUserAsync(request.Name, request.Email, request.Password);
                return await SendAuthenticationTokenAsync(user);
            }
            catch (DuplicateUserException e)
            {
                return Conflict(e.Message);
            }
            catch (Exception)
            {
                return StatusCode(500, "An unexpected error occurred.");
            }
        }
        
        [AllowAnonymous]
        [HttpPost("refresh")]
        public async Task<IActionResult> RefreshAsync([FromBody] AccessToken expiredAccessToken)
        {
            if (string.IsNullOrWhiteSpace(expiredAccessToken?.Token)) 
                return BadRequest("Invalid Access Token");
            var refreshToken = Request.Cookies[CookieNames.RefreshToken];
            if (string.IsNullOrWhiteSpace(refreshToken)) 
                return BadRequest("Invalid Refresh Token");
            try
            {
                var user = await _userService.GetUserFromExpiredTokenAsync(expiredAccessToken.Token, refreshToken);
                return await SendAuthenticationTokenAsync(user);
            }
            catch (InvalidOperationException e)
            {
                return BadRequest(e.Message);
            }
            catch (InvalidRefreshTokenException e)
            {
                return Unauthorized(e.Message);
            }
            catch (UnauthorizedAccessException e)
            {
                return Unauthorized(e.Message);
            }
            catch (Exception)
            {
                return StatusCode(500, "Unable to refresh expired access token");
            }
        }
        
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePasswordAsync([FromBody] ChangePasswordRequest request)
        {
            try
            {
                await _userService.ChangePasswordAsync(request.OldPassword, request.NewPassword);
                return NoContent();
            }
            catch (InvalidOperationException e)
            {
                return BadRequest(e.Message);
            }
            catch (ArgumentException e)
            {
                return BadRequest(e.Message);
            }
            catch (UnauthorizedAccessException e)
            {
                return Unauthorized(e.Message);
            }
            catch (Exception)
            {
                return StatusCode(500, "An unexpected error occurred.");
            }
        }
        
        [AllowAnonymous]
        [HttpPost, Route("forgot-password")]
        public async Task<IActionResult> ResetPasswordAsync([FromBody] ForgotPasswordRequest request)
        {
            if (!EmailHelper.EmailRegex.IsMatch(request.Email)) 
                return BadRequest("Invalid client request");
            
            try
            {
                var token = await _userService.CreatePasswordResetTokenForUserAsync(request.Email);
            
                var resetLink =
                    $"{Request.Scheme}://{Request.Host}/password/reset?token={token}&email={Uri.EscapeDataString(request.Email)}";
                var emailBody = EmailHelper.GeneratePasswordResetEmailBody(resetLink);
                const string subject = EmailHelper.PasswordResetSubject;
                await _mailService.SendEmailAsync(new MailAddress(request.Email), subject, emailBody);
                return NoContent();
            }
            catch (InvalidOperationException e)
            {
                return BadRequest(e.Message);
            }
            catch (Exception)
            {
                return StatusCode(500, "An unexpected error occurred.");
            }
        }
        
        [AllowAnonymous]
        [HttpPost, Route("reset-password")]
        public async Task<IActionResult> ResetPasswordAsync([FromBody] PasswordResetRequest request)
        {
            if (request == null)
                return BadRequest("Invalid client request");
            try
            {
                var user = await _userService.ResetPasswordWithTokenAsync(request.Email, request.Token,
                    request.NewPassword);
                return user.TwoFaEnabled
                    ? await SendTwoFactorAuthenticationTokenAsync(user)
                    : await SendAuthenticationTokenAsync(user);
            }
            catch (InvalidOperationException e)
            {
                return BadRequest(e.Message);
            }
            catch (ArgumentException e)
            {
                return BadRequest(e.Message);
            }
            catch (UnauthorizedAccessException e)
            {
                return Unauthorized(e.Message);
            }
            catch (Exception)
            {
                return StatusCode(500, "An unexpected error occurred.");
            }
        }
        
        [AllowAnonymous]
        [HttpDelete("revoke")]
        public async Task<IActionResult> RevokeAsync([FromBody] AccessToken expiredAccessToken)
        {
            if (string.IsNullOrWhiteSpace(expiredAccessToken?.Token))
                return BadRequest("Invalid Access Token");

            var refreshToken = Request.Cookies[CookieNames.RefreshToken];
            if (string.IsNullOrWhiteSpace(refreshToken))
                return BadRequest("Invalid Refresh Token");

            try
            {
                await _userService.ClearRefreshTokenAsync(expiredAccessToken.Token, refreshToken);
                return NoContent();
            }
            catch (InvalidRefreshTokenException e)
            {
                return Unauthorized(e.Message);
            }
            catch (UnauthorizedAccessException e)
            {
                return Unauthorized(e.Message);
            }
            catch (InvalidOperationException e)
            {
                return BadRequest(e.Message);
            }
            catch (Exception)
            {
                return StatusCode(500, "An unexpected error occurred.");
            }
        }

        [HttpPost("setup-2fa")]
        public async Task<IActionResult> Setup2FaAsync()
        {
            try
            {
                var setupResult = await _userService.GenerateTwoFaSecretAsync();
                
                const string issuer = "Cloud Storage";
                var  otpUri = $"otpauth://totp/{issuer}:{setupResult.Email}?secret={setupResult.SecretKey}&issuer={issuer}&algorithm=SHA1&digits=6&period=30";
                return Ok(new {otpUri, setupResult.SecretKey});
            }
            catch (InvalidOperationException e)
            {
                return BadRequest(e.Message);
            }
            catch (Exception)
            {
                return StatusCode(500, "An unexpected error occurred.");
            }
        }

        [HttpPost("toggle-2fa")]
        public async Task<IActionResult> Toggle2FaAsync([FromBody] TwoFaRequest request)
        {
            try
            {
                var result = await _userService.ToggleTwoFaAsync(request.Password, request.Code);
                return Ok(result);
            }
            catch (InvalidOperationException e)
            {
                return BadRequest(e.Message);
            }
            catch (ArgumentException e)
            {
                return BadRequest(e.Message);
            }
            catch (UnauthorizedAccessException e)
            {
                return Unauthorized(e.Message);
            }
            catch (Exception)
            {
                return StatusCode(500, "An unexpected error occurred.");
            }
        }

        [HttpGet("two-fa-enabled")]
        public async Task<IActionResult> IsTwoFactorEnabledAsync()
        {
            try
            {
                var result = await _userService.IsTwoFactorEnabledAsync();
                return Ok(result);
            }
            catch (InvalidOperationException e)
            {
                return BadRequest(e.Message);
            }
            catch (Exception)
            {
                return StatusCode(500, "An unexpected error occurred.");
            }
        }
        
        private async Task<IActionResult> SendAuthenticationTokenAsync(User user)
        {
            var tokenResult = await _userService.GenerateAccessTokenAsync(user, AccessTokenType.Authentication);
            if (tokenResult.RefreshToken is null)
                throw new InvalidOperationException("Refresh token was not generated.");
            Response.Cookies.Append(CookieNames.RefreshToken, tokenResult.RefreshToken, _cookieOptionsProvider.GetOptions());

            return Ok(new AccessToken(tokenResult.AccessToken, AccessTokenType.Authentication));
        }

        private async Task<OkObjectResult> SendTwoFactorAuthenticationTokenAsync(User user)
        {
            var tokenResult = await _userService.GenerateAccessTokenAsync(user, AccessTokenType.TwoFactorAuthentication);

            return Ok(new AccessToken(tokenResult.AccessToken, AccessTokenType.TwoFactorAuthentication));
        }
    }
}
