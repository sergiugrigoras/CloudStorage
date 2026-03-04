using CloudStorage.Models;
using CloudStorage.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Bson;

namespace CloudStorage.Controllers;

[Authorize]
[Route("api/storage-node")]
[ApiController]
public class StorageNodeController(IStorageNodeService storageNodeService, IUserService userService, IStorageService storageService)
    : ControllerBase
{
    private readonly IStorageNodeService _storageNodeService = storageNodeService ?? throw new ArgumentNullException(nameof(storageNodeService));
    private readonly IStorageService _storageService = storageService ?? throw new ArgumentNullException(nameof(storageService));

    [HttpGet("root")]
    public async Task<IActionResult> GetUserRootContentAsync()
    {
        try
        {
            var nodes = await _storageNodeService.GetNodesAsync();
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
        if (nodeInput is not { IsFolder: true } || string.IsNullOrWhiteSpace(nodeInput.Name))
            return BadRequest();

        try
        {
            var node = await _storageNodeService.CreateAsync(nodeInput.ToDomain());
            return Ok(StorageNodeViewModel.FromDomain(node));
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
        if (nodeInput == null)
            return BadRequest();

        try
        {
            var resultNode = await _storageNodeService.RenameAsync(nodeInput.ToDomain());
            return Ok(StorageNodeViewModel.FromDomain(resultNode));
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
    public async Task<IActionResult> DeleteAsync([FromBody] List<string> request)
    {
        if (request == null || request.Count == 0)
            return BadRequest("Invalid delete list");
        
        try
        {
            var deleteList = request
                .Select(x => ObjectId.TryParse(x, out var id) ? id : ObjectId.Empty)
                .Where(x => x != ObjectId.Empty)
                .ToList();
            await _storageNodeService.DeleteAsync(deleteList);
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
        if (request?.NodeIds == null)
            return BadRequest("Invalid request");

        try
        {
            var moveList = request.NodeIds
                .Select(x => ObjectId.TryParse(x, out var id) ? id : ObjectId.Empty)
                .Where(x => x != ObjectId.Empty)
                .ToList();
            var hasDestinationNode = ObjectId.TryParse(request.DestinationNodeId, out var destinationNodeId);
            var result = await _storageNodeService.MoveNodesAsync(moveList, hasDestinationNode ? destinationNodeId : null);
            return  Ok(result.Select(StorageNodeViewModel.FromDomain));
        }
        catch (Exception)
        {
            return StatusCode(500, "An unexpected error occurred.");
        }
    }

    [HttpPost("upload"), DisableRequestSizeLimit]
    public async Task<IActionResult> UploadAsync([FromForm] FileUploadModel uploadModel)
    {
        if (uploadModel?.Files == null) return BadRequest();
        
        // Check storage space.
        var storageInfo = await _storageService.GetUsedStorage();
        if (storageInfo == null) 
            return StatusCode(500, "Unable to retrieve storage info.");
        
        var uploadSize = uploadModel.Files.Sum(f => f.Length);
        if (!storageInfo.HasSpace(uploadSize))
            return BadRequest("Not enough storage space.");
        
        var result = new List<StorageNodeViewModel>();
        foreach (var file in uploadModel.Files)
        {
            try
            {
                var hasDestinationNode = ObjectId.TryParse(uploadModel.NodeId, out var parentId);
                var node = await _storageNodeService.StoreFileAsync(file, hasDestinationNode ? parentId : null);
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
        if (request?.NodeIds == null)
            return BadRequest("Invalid request");

        try
        {
            var downloadList = request.NodeIds
                .Select(x => ObjectId.TryParse(x, out var id) ? id : ObjectId.Empty)
                .Where(x => x != ObjectId.Empty)
                .ToList();
            
            var result = await _storageNodeService.DownloadNodesAsync(downloadList);
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