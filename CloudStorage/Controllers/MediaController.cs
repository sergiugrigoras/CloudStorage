﻿using CloudStorage.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.FileProviders;
using System.Globalization;

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
        private const string _snapshotContentType = "image/png";
        private const string _contentKey = "ContentKey";
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
            string contentType = _snapshotContentType;
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
            var cookieOptions = new CookieOptions();
            cookieOptions.HttpOnly = true;
            cookieOptions.Expires = DateTime.Now.AddMinutes(1);
            cookieOptions.Path = "/api/content";
            var key = _contentAuthorization.GenerateKeyForUser(user.Id);
            Response.Cookies.Append(_contentKey, key, cookieOptions);

            return Ok();
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
