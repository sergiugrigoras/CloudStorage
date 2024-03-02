using CloudStorage.Models;
using CloudStorage.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;


namespace CloudStorage.Controllers;

[Route("api/[controller]")]
[ApiController]
public class TokenController(ITokenService tokenService, IUserService userService) : ControllerBase
{
    private readonly ITokenService _tokenService = tokenService ?? throw new ArgumentNullException(nameof(tokenService));
    private readonly IUserService _userService = userService ?? throw new ArgumentNullException(nameof(userService));

    [HttpPost]
    [Route("refresh")]
    public async Task<IActionResult> RefreshAsync([FromBody] TokenApiModel tokenApiModel)
    {
        if (tokenApiModel is null || tokenApiModel.AccessToken == string.Empty || tokenApiModel.RefreshToken == string.Empty)
        {
            return BadRequest("Invalid client request");
        }

        var accessToken = tokenApiModel.AccessToken;
        var refreshToken = tokenApiModel.RefreshToken;

        var principal = _tokenService.GetPrincipalFromExpiredToken(accessToken);
        var user = await _userService.GetUserAsync(principal);
        if (user == null || user.RefreshToken != refreshToken || user.RefreshTokenExpiryTime <= DateTime.Now)
        {
            return BadRequest("Invalid client request");
        }

        var newAccessToken = _tokenService.GenerateAccessToken(principal.Claims);
        var newRefreshToken = _tokenService.GenerateRefreshToken();
        user.RefreshToken = newRefreshToken;
        await _userService.UpdateUserAsync(user);

        var result = new TokenApiModel(newAccessToken, newRefreshToken);
        return new JsonResult(result);
    }

    [HttpDelete, Authorize]
    [Route("revoke")]
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