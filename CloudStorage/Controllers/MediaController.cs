using CloudStorage.Models.Media;
using CloudStorage.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CloudStorage.ViewModels;

namespace CloudStorage.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class MediaController(IMediaService mediaService)
    : ControllerBase
{
    [HttpPost("search")]
    public async Task<IActionResult> SearchMediaObjectsAsync([FromBody] MediaEntryQuery query)
    {
        try
        {
            var entries = await mediaService.GetMediaEntriesAsync(query);
            return Ok(entries.Select(MediaEntryViewModel.FromDomain));
        }
        catch (Exception)
        {
            return StatusCode(500, "An unexpected error occurred.");
        }
    }

    [HttpGet("snapshot/{id}")]
    public async Task<IActionResult> GetSnapshotAsync(string id)
    {
        try
        {
            var mediaEntry = await mediaService.GetMediaEntryByIdAsync(id);
            var result = await mediaService.GetSnapshotStreamAsync(mediaEntry);
            return result == null ? NotFound() : File(result.Stream, result.ContentType);
        }
        catch (Exception)
        {
            return StatusCode(500, "An unexpected error occurred.");
        }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetMediaContentAsync(string id)
    {
        try
        {
            var mediaEntry = await mediaService.GetMediaEntryByIdAsync(id);
            var result = mediaService.GetMediaStream(mediaEntry);
            return result == null ? NotFound() : File(result.Stream, result.ContentType);
        }
        catch (Exception)
        {
            return StatusCode(500, "An unexpected error occurred.");
        }
    }

    [HttpGet("access-key")]
    public IActionResult SetAccessKeyCookie()
    {
        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Expires = DateTime.Now.AddMinutes(2),
            Path = "/api/content"
        };
        try
        {
            var key = mediaService.GenerateContentAccessKey();
            Response.Cookies.Append(CookieNames.ContentKey, key, cookieOptions);

            return NoContent();
        }
        catch (Exception)
        {
            return StatusCode(500, "An unexpected error occurred.");
        }
    }

    [HttpDelete("access-key")]
    public IActionResult RemoveAccessKey()
    {
        try
        {
            mediaService.RemoveContentAccessKey();
            return NoContent();
        }
        catch (Exception)
        {
            return StatusCode(500, "An unexpected error occurred.");
        }
    }

    [HttpPut("favorite/{id}")]
    public async Task<IActionResult> ToggleFavoriteAsync(string id)
    {
        try
        {
            var result = await mediaService.ToggleFavorite(id);
            if (result == null)
                return NotFound();
            return Ok(result);
        }
        catch (Exception)
        {
            return StatusCode(500, "An unexpected error occurred.");
        }
    }

    [HttpPost("upload"), DisableRequestSizeLimit]
    public async Task<IActionResult> UploadAsync([FromForm] IEnumerable<IFormFile> files)
    {
        try
        {
            var mediaEntries = await mediaService.UploadMediaFilesAsync(files);
            if (mediaEntries == null)
                throw new Exception("Unable to upload files.");
            
            return Ok(mediaEntries.Select(MediaEntryViewModel.FromDomain));
        }
        catch (Exception)
        {
            return StatusCode(500, "An unexpected error occurred.");
        }
    }

    [HttpPost("new-album")]
    public async Task<IActionResult> CreateAlbumAsync([FromBody] MediaAlbumViewModel album)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(album?.Name))
                return BadRequest();
            await mediaService.CreateAlbumAsync(album.Name);
            return Ok(album.Name);
        }
        catch (Exception)
        {
            return StatusCode(500, "An unexpected error occurred.");
        }
    }

    [HttpGet("all-albums")]
    public async Task<IActionResult> GetUserAlbumsAsync()
    {
        try
        {
            var albums = await mediaService.GetAlbumsAsync();
            return Ok(albums.Select(MediaAlbumViewModel.FromDomain));
        }
        catch (Exception)
        {
            return StatusCode(500, "An unexpected error occurred.");
        }
    }

    [HttpPost("album-add")]
    public async Task<IActionResult> AddMediaToAlbumAsync([FromBody] MediaToAlbumViewModel viewModel)
    {
        try
        {
            if (viewModel?.AlbumsIds == null || viewModel.MediaObjectsIds == null)
                return BadRequest();
            await mediaService.AddToAlbumAsync(viewModel.MediaObjectsIds, viewModel.AlbumsIds);
            return Ok();
        }
        catch (Exception)
        {
            return StatusCode(500, "An unexpected error occurred.");
        }
    }

    [HttpGet("unique-album-name")]
    public async Task<IActionResult> CheckAlbumUniqueName(string name)
    {
        var exists = await mediaService.AlbumExistsAsync(name);
        return Ok(!exists);
    }

    [HttpGet("album")]
    public async Task<IActionResult> GetAlbumContentAsync(string name)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(name))
                return BadRequest("Invalid album name.");
            var mediaEntries = await mediaService.GetAlbumContentAsync(name);
            return Ok(mediaEntries.Select(MediaEntryViewModel.FromDomain));
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

    [HttpDelete]
    public async Task<IActionResult> DeleteMediaAsync([FromBody] MediaEntryQuery query, bool permanent = false)
    {
        if (query?.Ids == null)
            return BadRequest("Invalid query.");
        try
        {
            await mediaService.DeleteMediaEntriesAsync(query.Ids, permanent);
            return NoContent();
        }
        catch (Exception)
        {
            return StatusCode(500, "An unexpected error occurred.");
        }
    }

    [HttpPost("restore")]
    public async Task<IActionResult> RestoreMediaAsync([FromBody] MediaEntryQuery query)
    {
        if (query?.Ids == null)
            return BadRequest("Invalid query.");
        try
        {
            await mediaService.RestoreMediaEntriesAsync(query.Ids);
            return Ok();
        }
        catch (Exception)
        {
            return StatusCode(500, "An unexpected error occurred.");
        }
    }
}