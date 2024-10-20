using CloudStorage.Interfaces.Media;
using CloudStorage.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CloudStorage.ViewModels;

namespace CloudStorage.Controllers;

[Authorize]
[Route("api/[controller]")]
[ApiController]
public class MediaController(
    IMediaService mediaService,
    IUserService userService,
    ContentAuthorization contentAuthorization)
    : ControllerBase
{
    private const string SnapshotContentType = "image/jpg";
    private const string ContentKey = "ContentKey";

    [HttpPost("search")]
    public async Task<IActionResult> SearchMediaObjectsAsync([FromBody]MediaObjectFilter filter)
    {
        var user = await userService.GetUserAsync(User);
        if (user == null) return Unauthorized();
        filter.UserId = user.Id;
        var mediaObjects = await mediaService.GetMediaObjectsAsync(filter);
        var result = mediaObjects.Select(x => new MediaObjectViewModel(x));
        return new JsonResult(result);
    }

    [HttpGet("snapshot/{id:guid}")]
    public async Task<IActionResult> GetSnapshotAsync(Guid id)
    {
        var user = await userService.GetUserAsync(User);
        if (user == null) return Unauthorized();
        var mediaObject = await mediaService.GetMediaObjectByIdAsync(id);
        if (mediaObject == null) return NotFound();
        if (mediaObject.OwnerId != user.Id) return Forbid();
        
        var stream = await mediaService.GetSnapshotStreamAsync(id);
        if (stream == null) return NotFound();
        return File(stream, SnapshotContentType);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetMediaContentAsync(Guid id)
    {
        var user = await userService.GetUserAsync(User);
        if (user == null) return Unauthorized();
        var mediaObject = await mediaService.GetMediaObjectByIdAsync(id);
        if (mediaObject == null) return NotFound();
        if (mediaObject.OwnerId != user.Id) return Forbid();
        
        var stream = await mediaService.GetMediaStreamAsync(id);
        if (stream == null) return NotFound();
        
        return File(stream, mediaObject.ContentType);
    }

    [HttpGet("access-key")]
    public async Task<IActionResult> SetAccessKeyCookie()
    {
        var user = await userService.GetUserAsync(User);
        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Expires = DateTime.Now.AddMinutes(2),
            Path = "/api/content"
        };
        var key = contentAuthorization.GenerateKeyForUser(user.Id);
        Response.Cookies.Append(ContentKey, key, cookieOptions);

        return Ok();
    }

    [HttpDelete("access-key")]
    public async Task<IActionResult> RemoveAccessKey()
    {
        var user = await userService.GetUserAsync(User);
        contentAuthorization.RemoveKeyForUser(user.Id);

        return Ok();
    }
    

    [HttpPost("favorite")]
    public async Task<IActionResult> ToggleFavoriteAsync([FromBody] Identifiable body)
    {
        var user = await userService.GetUserAsync(User);
        if (user == null) return Unauthorized();
        if (body == null) return BadRequest();
        var mediaObject = await mediaService.GetMediaObjectByIdAsync(body.Id);
        if (mediaObject == null) return NotFound();
        if (mediaObject.OwnerId != user.Id) return Forbid();
        try
        {
            var result = await mediaService.ToggleFavorite(mediaObject.Id);
            if (result == null) return NotFound();
            return Ok(result);
        }
        catch (Exception e)
        {
            return BadRequest(e.Message);
        }
    }

    [HttpPost("upload"), DisableRequestSizeLimit]
    public async Task<IActionResult> UploadAsync([FromForm] IEnumerable<IFormFile> files)
    {
        var user = await userService.GetUserAsync(User);
        if (user == null) return Unauthorized();
        await mediaService.UploadMediaFilesAsync(files, user.Id);
        return Ok();
    }

    [HttpPost("new-album")]
    public async Task<IActionResult> CreateAlbumAsync([FromBody] MediaAlbumViewModel album)
    {
        if (string.IsNullOrWhiteSpace(album?.Name)) return BadRequest();
        var user = await userService.GetUserAsync(User);
        if (user == null) return Unauthorized();
        await mediaService.CreateAlbumAsync(user.Id, album.Name);
        return new JsonResult(album.Name);
    }

    [HttpGet("all-albums")]
    public async Task<IActionResult> GetUserAlbumsAsync()
    {
        var user = await userService.GetUserAsync(User);
        if (user == null) return Unauthorized();
        var albums = await mediaService.GetAllUserAlbumsAsync(user.Id);
        var result = albums.Select(album => new MediaAlbumViewModel(album));
        return new JsonResult(result);
    }

    [HttpPost("album-add")]
    public async Task<IActionResult> AddMediaToAlbumAsync([FromBody] MediaToAlbumViewModel viewModel)
    {
        var user = await userService.GetUserAsync(User);
        if (user == null) return Unauthorized();
        await mediaService.AddMediaToAlbumAsync(user.Id, viewModel.MediaObjectsIds, viewModel.AlbumsIds);
        return Ok();
    }

    [HttpGet("unique-album-name")]
    public async Task<IActionResult> CheckAlbumUniqueName(string name)
    {
        if (string.IsNullOrWhiteSpace(name)) return BadRequest();
        var user = await userService.GetUserAsync(User);
        if (user == null) return Unauthorized();
        var isUnique = await mediaService.UniqueAlbumNameAsync(user.Id, name);
        return new JsonResult(isUnique);
    }

    [HttpGet("album")]
    public async Task<IActionResult> GetAlbumContentAsync(string name)
    {
        var user = await userService.GetUserAsync(User);
        if (user == null) return Unauthorized();
        var mediaObjects = await mediaService.GetAlbumContentAsync(user.Id, name);
        var result = mediaObjects.Select(x => new MediaObjectViewModel(x));
        return new JsonResult(result);
    }

    [HttpDelete]
    public async Task<IActionResult> DeleteMediaAsync([FromBody] MediaObjectFilter filter, bool permanent = false)
    {
        var user = await userService.GetUserAsync(User);
        if (user == null) return Unauthorized();
        filter.UserId = user.Id;
        await mediaService.DeleteMediaObjectsAsync(user.Id, filter, permanent);
        return Ok();
    }

    [HttpPost("restore")]
    public async Task<IActionResult> RestoreMediaAsync([FromBody] MediaObjectFilter filter)
    {
        var user = await userService.GetUserAsync(User);
        if (user == null) return Unauthorized();
        filter.UserId = user.Id;
        await mediaService.RestoreMediaObjectsAsync(filter);
        return Ok();
    }
}