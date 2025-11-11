using System.Net.Mail;
using System.Security.Claims;
using CloudStorage.Extensions;
using BC = BCrypt.Net.BCrypt;
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

            try
            {
                var user = !string.IsNullOrWhiteSpace(request.Username)
                    ? await _userService.GetUserByNameAsync(request.Username)
                    : await _userService.GetUserByEmailAsync(request.Email);
            
                if (user == null || !BC.Verify(request.Password, user.Password))
                    return BadRequest("Invalid user or password");
                if (user.Disabled)
                    return BadRequest("Account is Disabled");
            
                return user.TwoFaEnabled ? await SendTwoFaTokenAsync(user) : await LoginUserAsync(user);
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
            if (string.IsNullOrWhiteSpace(request?.Code) || string.IsNullOrEmpty(request.Token))
                return BadRequest("Invalid client request");

            try
            {
                var clientId = HttpContext.Request.Headers["X-Client-Id"].ToString();
                var principal = _tokenService.ValidateTwoFaToken(request.Token);

                var user = await _userService.GetUserAsync(principal);
                if (user == null)
                    throw new InvalidOperationException("User not found");
                var claimClientId = principal.FindFirst(AppClaims.ClientId)?.Value;
                if (claimClientId == null ||
                    !string.Equals(claimClientId, clientId, StringComparison.OrdinalIgnoreCase))
                    throw new InvalidOperationException("Invalid client ID.");

                var validCode = await _userService.VerifyTotpCodeAsync(user.Id, request.Code);
                if (!validCode)
                    throw new InvalidOperationException("Invalid code");

                return await LoginUserAsync(user);
            }
            catch (SecurityTokenException)
            {
                return Unauthorized("Invalid or expired token");
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

        private async Task<IActionResult> LoginUserAsync(User user)
        {
            var claims = _userService.GetUserClaims(user);
            var accessToken = _tokenService.GenerateAccessToken(claims, AccessTokenType.Authentication);
            var refreshToken = _tokenService.GenerateRefreshToken();
            user.RefreshToken = refreshToken;
            user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);
            await _userService.UpdateUserAsync(user);
            
            Response.Cookies.Append(CookieNames.RefreshToken, refreshToken, _cookieOptionsProvider.GetOptions());

            return new JsonResult(new AccessToken(accessToken, AccessTokenType.Authentication));
        }

        private async Task<IActionResult> SendTwoFaTokenAsync(User user)
        {
            var claims = _userService.GetUserClaims(user);
            var clientId = HttpContext.Request.Headers["X-Client-Id"].ToString();
            claims.Add(new Claim(AppClaims.ClientId, clientId));
            var twoFaToken = _tokenService.GenerateAccessToken(claims, AccessTokenType.TwoFactorAuthentication);
            return await Task.FromResult(new JsonResult(new AccessToken(twoFaToken, AccessTokenType.TwoFactorAuthentication)));
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
                var accessToken = _tokenService.GenerateAccessToken(claims, AccessTokenType.Authentication);
                var refreshToken = _tokenService.GenerateRefreshToken();
                newUser.RefreshToken = refreshToken;
                newUser.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);
                await _userService.UpdateUserAsync(newUser);
            
                Response.Cookies.Append(CookieNames.RefreshToken, refreshToken, _cookieOptionsProvider.GetOptions());

                return new JsonResult(new AccessToken(accessToken, AccessTokenType.Authentication));
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

                var newAccessToken = _tokenService.GenerateAccessToken(principal.Claims, AccessTokenType.Authentication);
                var newRefreshToken = _tokenService.GenerateRefreshToken();
                user.RefreshToken = newRefreshToken;
                user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);
                await _userService.UpdateUserAsync(user);
        
                Response.Cookies.Append(CookieNames.RefreshToken, newRefreshToken, _cookieOptionsProvider.GetOptions());
                return new JsonResult(new AccessToken(newAccessToken, AccessTokenType.Authentication));
            }
            catch (Exception e)
            {
                return StatusCode(500, "Unable to refresh expired access token");
            }
            
        }
        
        [AllowAnonymous]
        [HttpPost("check-unique")]
        public async Task<bool> UniqueUsernameAsync([FromBody] User request)
        {
            return await _userService.GetUserByNameAsync(request.Username) == null && await _userService.GetUserByEmailAsync(request.Email) == null;
        }
        
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePasswordAsync([FromBody] ChangePasswordRequest pass)
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

            var accessToken = _tokenService.GenerateAccessToken(claims, AccessTokenType.Authentication);
            var refreshToken = _tokenService.GenerateRefreshToken();

            user.RefreshToken = refreshToken;
            user.RefreshTokenExpiryTime = DateTime.UtcNow.AddDays(7);
            await _userService.UpdateUserAsync(user);
            await _userService.UpdateResetTokenAsync(resetToken);
            
            Response.Cookies.Append(CookieNames.RefreshToken, refreshToken, _cookieOptionsProvider.GetOptions());
            return new JsonResult(new AccessToken(accessToken, AccessTokenType.Authentication));
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

        [HttpPost("setup-2fa")]
        public async Task<IActionResult> Setup2FaAsync()
        {
            try
            {
                var user = await _userService.GetUserAsync(User);
                if (user == null)
                    return Unauthorized();
                if (user.TwoFaEnabled)
                    return BadRequest("Two-Factor Authentication Enabled");
                
                var secretKey = await _userService.GenerateTwoFaSecretAsync(user.Id);
                
                const string issuer = "Cloud Storage";
                var  otpUri = $"otpauth://totp/{issuer}:{user.Email}?secret={secretKey}&issuer={issuer}&algorithm=SHA1&digits=6&period=30";
                return new JsonResult(new {otpUri, secretKey});
            }
            
            catch (Exception)
            {
                return StatusCode(500, "An unexpected error occurred.");
            }
        }

        [HttpPost("toggle-2fa")]
        public async Task<IActionResult> Enable2FaAsync([FromBody] TwoFaRequest request)
        {
            var user = await _userService.GetUserAsync(User);
            if (user == null)
                return Unauthorized();
            
            if (!BC.Verify(request.Password, user.Password))
                return BadRequest("Invalid Password");
            
            if (string.IsNullOrWhiteSpace(request?.Code))
                return BadRequest("Invalid code");
            try
            {
                var result = await _userService.ToggleTwoFaAsync(user.Id, request.Code);
                return new JsonResult(result);
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

        [HttpGet("two-fa-enabled")]
        public async Task<IActionResult> IsTwoFactorEnabledAsync()
        {
            var user = await _userService.GetUserAsync(User);
            if (user == null) return Unauthorized();
            return new JsonResult(user.TwoFaEnabled);
        }
    }
}
