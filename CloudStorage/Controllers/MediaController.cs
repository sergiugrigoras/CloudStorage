using CloudStorage.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CloudStorage.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class MediaController : ControllerBase
    {
        private readonly IMediaService _mediaService;
        private readonly IFsoService _fsoService;
        private readonly IUserService _userService;

        public MediaController(IConfiguration configuration, IMediaService mediaService, IUserService userService, IFsoService fsoService)
        {
            _mediaService = mediaService;
            _userService = userService;
            _fsoService = fsoService;

        }
        [HttpGet("all")]
        public async Task<IActionResult> GetMediaFolderAsync()
        {
            var user = await _userService.GetUserFromPrincipalAsync(User);
            var result = await _mediaService.GetAllMediFilesAsync(user);
            return new JsonResult(result);
        }

        [HttpGet("snapshot/{id:guid}")]
        public async Task<IActionResult> GetSnapshotAsync(Guid id)
        {
            var user = await _userService.GetUserFromPrincipalAsync(User);
            (Stream stream, string contentType) = await _mediaService.GetMediaFileSnapshotAsync(user, id);
            return File(stream, contentType);
        }

        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetMediaContentAsync(Guid id)
        {
            var user = await _userService.GetUserFromPrincipalAsync(User);
            (Stream stream, string contentType) = await _mediaService.GetMediaFileAsync(user, id);
            return File(stream, contentType);
        }

        [HttpPost("parse")]
        public async Task<IActionResult> ParseMediaFolderAsync()
        {
            var user = await _userService.GetUserFromPrincipalAsync(User);
            await _mediaService.ParseMediaFolderAsync(user);
            return Ok();
        }
    }
}
