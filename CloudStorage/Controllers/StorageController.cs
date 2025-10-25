using CloudStorage.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CloudStorage.Controllers;

[Authorize]
[Route("api/[controller]")]
[ApiController]
public class StorageController(IUserService userService, IStorageService storageService) : ControllerBase
{
    private readonly IUserService _userService = userService ?? throw new ArgumentNullException(nameof(userService));
    private readonly IStorageService _storageService = storageService ?? throw new ArgumentNullException(nameof(storageService));
    
    [HttpGet("info")]
    public async Task<IActionResult> GetUserDiskInfo()
    {
        var user = await _userService.GetUserAsync(User);
        if (user == null) return Unauthorized();
        
        var storageInfo = await _storageService.GetUsedStorageByUser(user.Id);
        if (storageInfo == null) 
            return StatusCode(500, "Unable to retrieve storage info.");
        
        return new JsonResult(storageInfo);
    }
}