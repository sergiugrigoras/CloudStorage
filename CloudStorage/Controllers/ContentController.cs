using CloudStorage.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.FileProviders;

namespace CloudStorage.Controllers;

[Route("api/[controller]")]
public class ContentController(IMediaService mediaService, ContentAuthorization contentAuthorization)
    : ControllerBase
{
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetMediaContentAsync(Guid id)
    {
        var mediaObject = await mediaService.GetMediaObjectByIdAsync(id);
        if (mediaObject == null) return NotFound();
        var accessKey = Request.Cookies["ContentKey"];
        if (!contentAuthorization.ValidKey(mediaObject.OwnerId, accessKey)) return Forbid();
        var stream = await mediaService.GetMediaAsync(id);
        if (stream == null) return StatusCode(500, "Unable to retrieve the stream.");
        return File(stream, mediaObject.ContentType, enableRangeProcessing: true);
    }
}