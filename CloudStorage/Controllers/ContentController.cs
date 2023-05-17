using CloudStorage.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.FileProviders;

namespace CloudStorage.Controllers
{
    [Route("api/[controller]")]
    public class ContentController : ControllerBase
    {
        private readonly IMediaService _mediaService;

        public ContentController(IMediaService mediaService)
        {
            _mediaService = mediaService;
        }
        [HttpGet("video/{id:guid}")]
        public async Task<IActionResult> GetMediaContentAsync(Guid id)
        {
            var mediaObject = await _mediaService.GetMediaObjectByIdAsync(id);
            if (mediaObject == null) return NotFound();
            var stream = await _mediaService.GetMediaAsync(id);
            if (stream == null) return StatusCode(500, "Unable to retrieve the stream.");
            return File(stream, mediaObject.ContentType, enableRangeProcessing: true);
        }
    }
}
