using CloudStorage.Models;
using CloudStorage.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CloudStorage.Controllers;

[Authorize]
[Route("api/storage-node")]
[ApiController]
public class StorageNodeController(IStorageNodeService storageNodeService, IUserService userService, IStorageService storageService)
    : ControllerBase
{
    private readonly IStorageNodeService _storageNodeService = storageNodeService ?? throw new ArgumentNullException(nameof(storageNodeService));
    private readonly IUserService _userService = userService ?? throw new ArgumentNullException(nameof(userService));
    private readonly IStorageService _storageService = storageService ?? throw new ArgumentNullException(nameof(storageService));

    [HttpGet("root")]
    public async Task<IActionResult> GetUserRootContentAsync()
    {
        var user = await _userService.GetUserAsync(User);
        if (user == null) return Unauthorized();

        try
        {
            var nodes = await _storageNodeService.GetUserNodesAsync(user.Id);
            return new JsonResult(nodes.Select(StorageNodeViewModel.FromDomain));
        }
        catch (Exception)
        {
            return StatusCode(500, "An unexpected error occurred.");
        }
    }

    [HttpPost("add-folder")]
    public async Task<IActionResult> AddAsync([FromBody] StorageNodeInputModel nodeInput)
    {
        var user = await _userService.GetUserAsync(User);
        if (user == null) return Unauthorized();
        
        if (nodeInput is not { IsFolder: true } || string.IsNullOrWhiteSpace(nodeInput.Name))
            return BadRequest();

        try
        {
            var node = await _storageNodeService.CreateAsync(
                StorageNodeInputModel.ToDomain(nodeInput, user.Id, DateTime.UtcNow));
            return new JsonResult(StorageNodeViewModel.FromDomain(node));
        }
        catch (InvalidOperationException e)
        {
            return BadRequest(e.Message);
        }
        catch (ArgumentNullException e)
        {
            return BadRequest(e.Message);
        }
        catch (Exception)
        {
            return StatusCode(500, "An unexpected error occurred.");
        }
    }

    [HttpPut("rename")]
    public async Task<IActionResult> RenameAsync([FromBody] StorageNodeInputModel nodeInput)
    {
        var user = await _userService.GetUserAsync(User);
        if (user == null) return Unauthorized();
        if (nodeInput == null) return BadRequest();

        try
        {
            var resultNode = await _storageNodeService.RenameAsync(StorageNodeInputModel.ToDomain(nodeInput, user.Id));
            return new JsonResult(StorageNodeViewModel.FromDomain(resultNode));
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


    [HttpDelete("delete")]
    public async Task<IActionResult> DeleteAsync([FromBody] List<string> deleteList)
    {
        var user = await _userService.GetUserAsync(User);
        if (user == null) return Unauthorized();
        
        if (deleteList == null || deleteList.Count == 0)
            return BadRequest("Invalid delete list");
        
        try
        {
            await _storageNodeService.DeleteAsync(deleteList, user.Id);
            return NoContent();
        }
        catch (Exception)
        {
            return StatusCode(500, "An unexpected error occurred.");
        }
    }
    [HttpPost("move")]
    public async Task<IActionResult> MoveAsync([FromBody] CollectionOfNodes request)
    {
        var user = await _userService.GetUserAsync(User);
        if (user == null) return Unauthorized();

        if (request?.NodeIds == null)
            return BadRequest("Invalid request");

        try
        {
            var result = await _storageNodeService.MoveNodesAsync(request.NodeIds, request.DestinationNodeId,  user.Id);
            return  new JsonResult(result.Select(StorageNodeViewModel.FromDomain));
        }
        catch (Exception)
        {
            return StatusCode(500, "An unexpected error occurred.");
        }
    }

    [HttpPost("upload"), DisableRequestSizeLimit]
    public async Task<IActionResult> UploadAsync([FromForm] FileUploadModel uploadModel)
    {
        var user = await _userService.GetUserAsync(User);
        if (user == null) return Unauthorized();
        if (uploadModel?.Files == null) return BadRequest();
        
        // Check storage space.
        var storageInfo = await _storageService.GetUsedStorageByUser(user.Id);
        if (storageInfo == null) 
            return StatusCode(500, "Unable to retrieve storage info.");
        
        var uploadSize = uploadModel.Files.Sum(f => f.Length);
        if (!storageInfo.HasSpace(uploadSize))
            return BadRequest("Not enough storage space.");
        
        var result = new List<StorageNodeViewModel>();
        var utcNow = DateTime.UtcNow;
        foreach (var file in uploadModel.Files)
        {
            try
            {
                var node = await _storageNodeService.StoreFileAsync(file, user.Id, uploadModel.NodeId, utcNow);
                result.Add(StorageNodeViewModel.FromDomain(node));
            }
            catch
            {
                // ignored
            }
        }
        return new JsonResult(result);
    }

    [HttpPost("download")]
    public async Task<IActionResult> DownloadAsync([FromBody] CollectionOfNodes request)
    {
        var user = await _userService.GetUserAsync(User);
        if (user == null) return Unauthorized();

        if (request?.NodeIds == null)
            return BadRequest("Invalid request");

        try
        {
            var result = await _storageNodeService.DownloadNodesAsync(request.NodeIds, user.Id);
            return File(result.Stream, result.ContentType);
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
}