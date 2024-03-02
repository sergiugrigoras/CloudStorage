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
    private const string SnapshotContentType = "image/png";
    private const string ContentKey = "ContentKey";

    [HttpPost("all")]
    public async Task<IActionResult> GetMediaFolderAsync([FromBody]MediaObjectFilter filter)
    {
        var user = await userService.GetUserAsync(User);
        var result = await mediaService.GetAllMediaFilesAsync(user, filter);
        return new JsonResult(result);
    }

    [HttpGet("snapshot/{id:guid}")]
    public async Task<IActionResult> GetSnapshotAsync(Guid id)
    {
        var user = await userService.GetUserAsync(User);
        var stream = await mediaService.GetSnapshotAsync(user, id);
        string contentType = SnapshotContentType;
        return File(stream, contentType);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetMediaContentAsync(Guid id)
    {
        var user = await userService.GetUserAsync(User);
        if (user == null) return Unauthorized();
        var mediaObject = await mediaService.GetMediaObjectByIdAsync(id);
        if (mediaObject == null) return NotFound();
        if (mediaObject.OwnerId != user.Id) return Forbid();
        var stream = await mediaService.GetMediaAsync(id);
        if (stream == null) return StatusCode(500, "Unable to retrieve the stream.");

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

    [HttpPost("parse")]
    public async Task<IActionResult> ParseMediaFolderAsync()
    {
        var user = await userService.GetUserAsync(User);
        await mediaService.ParseMediaFolderAsync(user);
        return Ok();
    }

    [HttpPost("favorite")]
    public async Task<IActionResult> ToggleFavoriteAsync([FromBody] Identifiable mediaObject)
    {
        try
        {
            var result = await mediaService.ToggleFavorite(mediaObject.Id);
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
        var user = await userService.GetUserAsync(User);
        foreach (var file in files)
            await mediaService.UploadMediaFileAsync(file, user);

        return Ok();
    }

    [HttpPost("new-album")]
    public async Task<IActionResult> CreateAlbumAsync([FromBody] MediaAlbumViewModel album)
    {
        if (album == null || string.IsNullOrWhiteSpace(album.Name)) return BadRequest();
        var user = await userService.GetUserAsync(User);
        await mediaService.CreateAlbumAsync(user, album.Name);
        return new JsonResult(album?.Name);
    }

    [HttpGet("all-albums")]
    public async Task<IActionResult> GetUserAlbumsAsync()
    {
        var user = await userService.GetUserAsync(User);
        var albums = await mediaService.GetAllAlbumsAsync(user);
        var result = albums.Select(album => new MediaAlbumViewModel(album));
        return new JsonResult(result);
    }

    [HttpPost("album-add")]
    public async Task<IActionResult> AddMediaToAlbumAsync([FromBody] MediaToAlbumViewModel viewModel)
    {
        var user = await userService.GetUserAsync(User);
        await mediaService.AddMediaToAlbumAsync(user, viewModel.MediaObjectsIds, viewModel.AlbumsIds);
        return Ok();
    }

    [HttpGet("unique-album-name")]
    public async Task<IActionResult> CheckAlbumUniqueName(string name)
    {
        var user = await userService.GetUserAsync(User);
        var isUnique = await mediaService.UniqueAlbumNameAsync(user, name);
        return new JsonResult(isUnique);
    }

    [HttpGet("album")]
    public async Task<IActionResult> GetAlbumContentAsync(string name)
    {
        var user = await userService.GetUserAsync(User);
        var result = await mediaService.GetAlbumContentAsync(user, name);
        return new JsonResult(result);
    }

    [HttpDelete]
    public async Task<IActionResult> DeleteMediaAsync([FromBody] MediaObjectFilter filter, bool permanent = false)
    {
        var user = await userService.GetUserAsync(User);
        await mediaService.DeleteMediaObjectsAsync(user, filter, permanent);
        return Ok();
    }

    [HttpPost("restore")]
    public async Task<IActionResult> RestoreMediaAsync([FromBody] MediaObjectFilter filter)
    {
        var user = await userService.GetUserAsync(User);
        await mediaService.RestoreMediaObjectsAsync(user, filter);
        return Ok();
    }
}