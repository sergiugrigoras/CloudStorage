using BC = BCrypt.Net.BCrypt;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Text.RegularExpressions;
using System.Net.Mail;
using CloudStorage.Models;
using CloudStorage.Services;

namespace CloudStorage.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class PasswordController(ITokenService tokenService, IMailService mailService, IUserService userService)
        : ControllerBase
    {
        private readonly ITokenService _tokenService = tokenService ?? throw new ArgumentNullException(nameof(tokenService));
        private readonly IMailService _mailService = mailService ?? throw new ArgumentNullException(nameof(mailService));
        private readonly IUserService _userService = userService ?? throw new ArgumentNullException(nameof(userService));

        [HttpPost, Route("change")]
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
        [HttpPost, Route("token")]
        public async Task<IActionResult> GenerateResetTokenAsync([FromBody] User request)
        {
            if (request == null) return BadRequest("Invalid client request");
            var user = !string.IsNullOrWhiteSpace(request.Username)
                ? await _userService.GetUserByNameAsync(request.Username)
                : await _userService.GetUserByEmailAsync(request.Email);
            if (user == null) 
                return NotFound("Invalid user");
            if (user.Disabled)
                return BadRequest("Account is Disabled");
            
            var token = _userService.GenerateToken();
            try
            {
                var passwordResetToken = await _userService.CreateResetTokenAsync(user, token);
            
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
        [HttpPost, Route("reset")]
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
            return new JsonResult(new TokenApiModel(accessToken, refreshToken));
        }
    }
}
