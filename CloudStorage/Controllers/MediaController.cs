using CloudStorage.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.FileProviders;

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
        private const string snapshotContentType = "image/png";

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
            var stream = await _mediaService.GetSnapshotAsync(user, id);
            string contentType = snapshotContentType;
            return File(stream, contentType);
        }

        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetMediaContentAsync(Guid id)
        {
            var user = await _userService.GetUserFromPrincipalAsync(User);
            if (user == null) return Unauthorized();
            var mediaObject = await _mediaService.GetMediaObjectByIdAsync(id);
            if (mediaObject == null) return NotFound();
            var stream = await _mediaService.GetMediaAsync(id);
            if (stream == null) return StatusCode(500, "Unable to retrieve the stream.");

            return File(stream, mediaObject.ContentType);
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
