using CloudStorage.Models;
using CloudStorage.Services;
using CloudStorage.ViewModels;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Net.Http.Headers;

namespace CloudStorage.Controllers;

[Authorize]
[Route("api/[controller]")]
[ApiController]
public class FsoController(IConfiguration configuration, IFsoService fsoService, IUserService userService)
    : ControllerBase
{
    private readonly IFsoService _fsoService = fsoService ?? throw new ArgumentNullException(nameof(fsoService));
    private readonly IUserService _userService = userService ?? throw new ArgumentNullException(nameof(userService));
    private readonly string _storageSize = configuration.GetValue<string>("Storage:size");

    [HttpGet("root")]
    public async Task<IActionResult> GetUserRootContentAsync()
    {
        var user = await _userService.GetUserAsync(User);
        if (user == null) return Unauthorized();
        var root = await _fsoService.GetUserRootAsync(user.Id);
        if (root == null) return NotFound();
        await _fsoService.LoadFolderContentAsync(root);
        return new JsonResult(new FileSystemObjectViewModel(root));
    }

    [HttpGet("folder/{id:int}")]
    public async Task<IActionResult> GetFolderContentAsync(int id)
    {
        var user = await _userService.GetUserAsync(User);
        var fso = await _fsoService.GetByIdAsync(id);
        if (user == null) return Unauthorized();
        if (fso == null) return NotFound();
        if (fso.OwnerId != user.Id) return Forbid();
        await _fsoService.LoadFolderContentAsync(fso);
        return new JsonResult(new FileSystemObjectViewModel(fso));
    }

    [HttpGet("drive-info")]
    public async Task<IActionResult> GetUserDiskInfo()
    {
        var user = await _userService.GetUserAsync(User);
        if (user == null) return Unauthorized();
        var root = await _fsoService.GetUserRootAsync(user.Id);
        if (root == null) return NotFound();
            
        var usedBytes = await _fsoService.GetFsoSizeByIdAsync(root.Id);;
        var totalBytes = long.Parse(_storageSize);
        return new JsonResult(new DiskInfo(totalBytes, usedBytes));
    }

    [HttpGet("full-path/{id:int}")]
    public async Task<IActionResult> GetFsoFullPathAsync(int id)
    {
        var fso = await _fsoService.GetByIdAsync(id);
        var user = await _userService.GetUserAsync(User);
        if (fso == null) return NotFound();
        if (!fso.CheckOwnership(user.Id)) return Forbid();

        var list = await _fsoService.GetFullPathAsync(fso);
        var result = list.Select(x => new FileSystemObjectViewModel(x));
        return new JsonResult(result);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetAsync(int id)
    {
        var fso = await _fsoService.GetByIdAsync(id);
        var user = await _userService.GetUserAsync(User);
        if (fso == null) return NotFound();
        if (!fso.CheckOwnership(user.Id)) return Forbid();

        var result = new FileSystemObjectViewModel(fso);
        return new JsonResult(result);
    }

    [HttpPost("add-folder")]
    public async Task<IActionResult> AddAsync([FromBody] FileSystemObjectViewModel viewModel)
    {
        if (viewModel is not { IsFolder: true } || !viewModel.ParentId.HasValue) return BadRequest();
        var exists = await _fsoService.FindAsync(viewModel.Name, viewModel.ParentId.Value);
        if (exists is { IsFolder: true }) return BadRequest("Name is not unique");
        var user = await _userService.GetUserAsync(User);
        if (user == null) return Unauthorized();
        var parent = await _fsoService.GetByIdAsync(viewModel.ParentId.Value);
        if (!parent.CheckOwnership(user.Id)) return Forbid();
        viewModel.OwnerId = user.Id;
        var folder = await _fsoService.CreateAsync(viewModel);
        return new JsonResult(new FileSystemObjectViewModel(folder));
    }

    [HttpPut("rename")]
    public async Task<IActionResult> RenameAsync([FromBody]FileSystemObjectViewModel viewModel)
    {
        if (viewModel == null) return BadRequest();
        var fso = await _fsoService.GetByIdAsync(viewModel.Id);
        var user = await _userService.GetUserAsync(User);
        if (fso == null) return NotFound();
        if (!fso.CheckOwnership(user.Id)) return Forbid();
        try
        {
            await _fsoService.RenameAsync(fso, viewModel.Name);
            return Ok();
        }
        catch (Exception e)
        {
            return BadRequest(e.Message);
        }
    }


    [HttpDelete("delete")]
    public async Task<IActionResult> DeleteAsync([FromBody] IEnumerable<int> list)
    {
        var user = await _userService.GetUserAsync(User);
        foreach (var id in list)
        {
            var fso = await _fsoService.GetByIdAsync(id);
            if (fso.CheckOwnership(user.Id))
                await _fsoService.DeleteAsync(fso);
        }
        return Ok();
    }
    [HttpPost("move")]
    public async Task<IActionResult> MoveAsync([FromBody]IEnumerable<int> ids, int destinationId)
    {
        var user = await _userService.GetUserAsync(User);

        var destination = await _fsoService.GetByIdAsync(destinationId);
        if (destination is not { IsFolder: true }) return BadRequest("Destination is NOT a folder.");
        if (!destination.CheckOwnership(user.Id)) return Forbid();

        var successList = new List<FileSystemObjectViewModel>();
        var failList = new List<FileSystemObjectViewModel>();
        foreach (var id in ids)
        {
            var fso = await _fsoService.GetByIdAsync(id);
            if (!fso.CheckOwnership(user.Id)) continue;
            try
            {
                await _fsoService.MoveFsoAsync(fso, destination);
                successList.Add(new FileSystemObjectViewModel(fso));
            }
            catch (FsoException)
            {
                failList.Add(new FileSystemObjectViewModel(fso));
            }
        }
        return Ok(new { success = successList, fail = failList });
    }

    [HttpPost("upload"), DisableRequestSizeLimit]
    public async Task<IActionResult> UploadAsync([FromForm] IList<IFormFile> files, [FromForm] string parentId)
    {
        var root = await _fsoService.GetByIdAsync(int.Parse(parentId));
        var user = await _userService.GetUserAsync(User);
        if (root == null) return BadRequest("Invalid parent Id.");
        if (!root.CheckOwnership(user.Id)) return Forbid();
        try
        {
            var result = new List<FileSystemObjectViewModel>();
            foreach (var file in files)
            {
                var fileName = await _fsoService.StoreFileAsync(file, user.Id);
                var name = ContentDispositionHeaderValue.Parse(file.ContentDisposition).FileName;
                if (name == null) continue;
                name = await _fsoService.GetDistinctNameAsync(name.Trim('"'), root.Id, false);
                FileSystemObjectViewModel model = new()
                {
                    Name = name,
                    IsFolder = false,
                    OwnerId = user.Id,
                    ParentId = root.Id,
                    FileName = fileName,
                    FileSize = file.Length,
                    Date = DateTime.UtcNow
                };
                var fso = await _fsoService.CreateAsync(model);
                result.Add(new FileSystemObjectViewModel(fso));
            }
            return new JsonResult(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Internal server error : {ex.Message}");
        }
    }

    [HttpPost("download")]
    public async Task<IActionResult> DownloadAsync([FromBody] ICollection<int> ids)
    {
        var user = await _userService.GetUserAsync(User);
        var list = new List<FileSystemObject>();
        foreach (var id in ids) 
        {
            var fso = await _fsoService.GetByIdAsync(id);
            if (fso != null) list.Add(fso);
        }
        if (list.Count < 1) return NotFound();

        var first = list.First();
        var root = await _fsoService.GetByIdAsync(first.ParentId.GetValueOrDefault(-1));
        if (root == null) return BadRequest();
            
        var sameParent = list.All(x => x.ParentId == root.Id);
        if (!sameParent || !root.CheckOwnership(user.Id)) return Forbid();

        string contentType;
        if (list.Count > 1 || first.IsFolder)
            contentType = FsoService.GetMimeType(".zip");
        else
            contentType = FsoService.GetMimeType(Path.GetExtension(first.Name));

        var stream = await _fsoService.GetFileAsync(root, list);
        return File(stream, contentType);
    }

    [HttpGet("unique")]
    public async Task<IActionResult> CheckNameIsUniqueAsync([FromQuery]FileSystemObjectViewModel viewModel)
    {
        if (viewModel == null || !viewModel.ParentId.HasValue) return BadRequest();
        var result = await _fsoService.UniqueName(viewModel.Name, viewModel.ParentId.Value, viewModel.IsFolder);
        return new JsonResult(result);
    }

    private ObjectResult ReturnStatusCode(Exception ex)
    {
        var keys = ex.Data.Keys;
        var statusCode = ex.Data.Keys.Cast<string>().Single();
        var statusMessage = ex.Data[statusCode]?.ToString();
        return StatusCode(int.Parse(statusCode), statusMessage);
    }
}