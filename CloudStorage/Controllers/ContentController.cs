using CloudStorage.Services;
using Microsoft.AspNetCore.Mvc;

namespace CloudStorage.Controllers;

[Route("api/[controller]")]
public class ContentController(IMediaService mediaService)
    : ControllerBase
{
    [HttpGet("{id}")]
    public async Task<IActionResult> GetMediaContentAsync(string id)
    {
        try
        {
            var mediaEntry = await mediaService.GetMediaEntryForContentDeliveryAsync(id);
            if (mediaEntry == null)
                return NotFound();
            
            var accessKey = Request.Cookies[CookieNames.ContentKey];
            if (!mediaService.ValidateContentAccessKey(mediaEntry.UserId.ToString(), accessKey))
                return Forbid();
            
            var result = mediaService.GetMediaStream(mediaEntry);
            return result == null ? NotFound() : File(result.Stream, result.ContentType, enableRangeProcessing: true);
        }
        catch (Exception)
        {
            return StatusCode(500, "An unexpected error occurred.");
        }
    }
}