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

            if (user == null)
            {
                return NotFound("Invalid user");
            }

            var token = _userService.GenerateToken();
            var passwordResetToken = await _userService.CreateResetTokenAsync(user, token);

            _mailService.SendEmail(
                                    new MailAddress(user.Email),
                                    new MailAddress("support@mail.sergiug.space", "SCS Support"),
                                    "Password reset instructions",
                                    $"Hello, \n\nPlease use below link to reset your password\n{Request.Scheme}://{Request.Host}/password/reset?token={token}&id={passwordResetToken.Id}"
            );
            var hiddenEmail = Regex.Replace(user.Email, @"(?<=[\w]{1})[\w-\._\+%]*(?=[\w]{2}@)", m => new string('*', m.Length));
            return new JsonResult(hiddenEmail);
        }

        [AllowAnonymous]
        [HttpPost, Route("reset")]
        public async Task<IActionResult> ResetPasswordAsync([FromBody] PasswordResetRequest request)
        {
            var resetToken = await _userService.GetResetTokenByIdAsync(request.TokenId);
            if (resetToken == null || resetToken.ExpirationDate <= DateTime.Now || resetToken.TokenUsed || !BC.Verify(request.Token, resetToken.TokenHash))
            {
                return BadRequest();
            }
            else
            {
                var user = await _userService.GetUserByIdAsync(resetToken.UserId);
                user.Password = BC.HashPassword(request.NewPassword);
                resetToken.TokenUsed = true;

                var claims = _userService.GetUserClaims(user);

                var accessToken = _tokenService.GenerateAccessToken(claims);
                var refreshToken = _tokenService.GenerateRefreshToken();

                user.RefreshToken = refreshToken;
                user.RefreshTokenExpiryTime = DateTime.Now.AddDays(7);
                await _userService.UpdateUserAsync(user);
                await _userService.UpdateResetTokenAsync(resetToken);
                return new JsonResult(new TokenApiModel(accessToken, refreshToken));
            }
        }
    }
}
