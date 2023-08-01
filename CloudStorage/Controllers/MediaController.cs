using CloudStorage.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.FileProviders;
using System.Globalization;
using CloudStorage.ViewModels;
using CloudStorage.Models;

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
        private const string SnapshotContentType = "image/png";
        private const string ContentKey = "ContentKey";
        private readonly ContentAuthorization _contentAuthorization;

        public MediaController(IConfiguration configuration, IMediaService mediaService, IUserService userService, IFsoService fsoService, ContentAuthorization contentAuthorization)
        {
            _mediaService = mediaService;
            _userService = userService;
            _fsoService = fsoService;
            _contentAuthorization = contentAuthorization;

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
            string contentType = SnapshotContentType;
            return File(stream, contentType);
        }

        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetMediaContentAsync(Guid id)
        {
            var user = await _userService.GetUserFromPrincipalAsync(User);
            if (user == null) return Unauthorized();
            var mediaObject = await _mediaService.GetMediaObjectByIdAsync(id);
            if (mediaObject == null) return NotFound();
            if (mediaObject.OwnerId != user.Id) return Forbid();
            var stream = await _mediaService.GetMediaAsync(id);
            if (stream == null) return StatusCode(500, "Unable to retrieve the stream.");

            return File(stream, mediaObject.ContentType);
        }

        [HttpGet("access-key")]
        public async Task<IActionResult> SetAccessKeyCookie()
        {
            var user = await _userService.GetUserFromPrincipalAsync(User);
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Expires = DateTime.Now.AddMinutes(2),
                Path = "/api/content"
            };
            var key = _contentAuthorization.GenerateKeyForUser(user.Id);
            Response.Cookies.Append(ContentKey, key, cookieOptions);

            return Ok();
        }

        [HttpDelete("access-key")]
        public async Task<IActionResult> RemoveAccessKey()
        {
            var user = await _userService.GetUserFromPrincipalAsync(User);
            _contentAuthorization.RemoveKeyForUser(user.Id);

            return Ok();
        }

        [HttpPost("parse")]
        public async Task<IActionResult> ParseMediaFolderAsync()
        {
            var user = await _userService.GetUserFromPrincipalAsync(User);
            await _mediaService.ParseMediaFolderAsync(user);
            return Ok();
        }

        [HttpPost("favorite")]
        public async Task<IActionResult> ToggleFavoriteAsync([FromBody] Identifiable mediaObject)
        {
            try
            {
                var result = await _mediaService.ToggleFavorite(mediaObject.Id);
                return Ok(result);
            }
            catch (Exception e)
            {
                return BadRequest(e.Message);
            }
        }

        [HttpPost("upload"), DisableRequestSizeLimit]
        public async Task<IActionResult> UploadAsync([FromForm] IList<IFormFile> files)
        {
            var user = await _userService.GetUserFromPrincipalAsync(User);
            foreach (var file in files)
                await _mediaService.UploadMediaFileAsync(file, user);

            return Ok();
        }

        [HttpPost("new-album")]
        public async Task<IActionResult> CreateAlbumAsync([FromBody] MediaAlbumViewModel album)
        {
            if (album == null || string.IsNullOrWhiteSpace(album.Name)) return BadRequest();
            var user = await _userService.GetUserFromPrincipalAsync(User);
            await _mediaService.CreateAlbumAsync(user, album.Name);
            return new JsonResult(album?.Name);
        }

        [HttpGet("all-albums")]
        public async Task<IActionResult> GetUserAlbumsAsync()
        {
            var user = await _userService.GetUserFromPrincipalAsync(User);
            var albums = await _mediaService.GetAllAlbumsAsync(user);
            var result = albums.Select(album => new MediaAlbumViewModel(album));
            return new JsonResult(result);
        }

        [HttpPost("album-add")]
        public async Task<IActionResult> AddMediaToAlbumAsync([FromBody] MediaToAlbumViewModel viewModel)
        {
            var user = await _userService.GetUserFromPrincipalAsync(User);
            await _mediaService.AddMediaToAlbumAsync(user, viewModel.MediaObjectsIds, viewModel.AlbumsIds);
            return Ok();
        }

        [HttpGet("unique-album-name")]
        public async Task<IActionResult> CheckAlbumUniqueName(string name)
        {
            var user = await _userService.GetUserFromPrincipalAsync(User);
            var isUnique = await _mediaService.UniqueAlbumNameAsync(user, name);
            return new JsonResult(isUnique);
        }
    }
}
