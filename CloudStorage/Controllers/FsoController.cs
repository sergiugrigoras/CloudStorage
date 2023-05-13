using CloudStorage.Models;
using CloudStorage.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Net.Http.Headers;

namespace CloudStorage.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class FsoController : ControllerBase
    {
        private readonly IFsoService _fsoService;
        private readonly IUserService _userService;
        //private readonly IShareService _shareService;
        private readonly string _storageSize;

        public FsoController(IConfiguration configuration, IFsoService fsoService, IUserService userService/*, IShareService shareService*/)
        {
            _storageSize = configuration.GetValue<string>("Storage:size");
            _fsoService = fsoService ?? throw new ArgumentNullException(nameof(fsoService));
            _userService = userService ?? throw new ArgumentNullException(nameof(userService));
            /*_shareService = shareService ?? throw new ArgumentNullException(nameof(shareService));*/
        }

        [HttpGet("root")]
        public async Task<IActionResult> GetUserRootContentAsync()
        {
            var user = await _userService.GetUserFromPrincipalAsync(User);

            if (user == null) return Unauthorized();

            var root = await _fsoService.GetUserRoot(user.Id);
            return new JsonResult(new FileSystemObjectViewModel(root));
        }

        [HttpGet("folder/{id}")]
        public async Task<IActionResult> GetFolderContentAsync(int id)
        {
            var user = await _userService.GetUserFromPrincipalAsync(User);
            if (user == null) return Unauthorized();

            try
            {
                var result = await _fsoService.GetFolderContent(id, user.Id);
                return new JsonResult(new FileSystemObjectViewModel(result));
            }
            catch (Exception ex)
            {
                return ReturnStatusCode(ex);
            }
        }

        [HttpGet("getuserdiskinfo")]
        public async Task<IActionResult> GetUserDiskInfo()
        {
            var user = await _userService.GetUserFromPrincipalAsync(User);

            if (user == null)
            {
                return Unauthorized();
            }
            else
            {
                var usedBytes = 0;//await _fsoService.GetFsoSizeByIdAsync((int)user.DriveId);
                var totalBytes = long.Parse(_storageSize);
                var diskUsed = Math.Round(usedBytes * 100.0 / totalBytes);
                return Ok(new { usedBytes = usedBytes.ToString(), totalBytes = totalBytes.ToString(), diskUsed = diskUsed.ToString() });
            }
        }

        [HttpGet("fullpath/{id}")]
        public async Task<IActionResult> GetFsoFullPathAsync(int id)
        {
            var fso = await _fsoService.GetFsoByIdAsync(id);
            var user = await _userService.GetUserFromPrincipalAsync(User);
            if (fso == null)
            {
                return NotFound();
            }
            if (!_fsoService.CheckOwner(fso, user))
            {
                return Forbid();
            }

            var list = await _fsoService.GetFsoFullPathAsync(fso);
            var listDTO = _fsoService.ToDTO(list);
            return new JsonResult(listDTO);
        }

        /*        [HttpGet("folder/{id}")]
                public async Task<IActionResult> GetFolderContentAsync(int id)
                {
                    FileSystemObject fso = await _fsoService.GetFsoByIdAsync(id);
                    User user = await _userService.GetUserFromPrincipalAsync(this.User);
                    if (fso == null)
                    {
                        return NotFound();
                    }

                    if (!await _fsoService.CheckOwnerAsync(fso, user))
                    {
                        return Forbid();
                    }

                    if (!fso.IsFolder)
                    {
                        return BadRequest("Not a folder");
                    }
                    else
                    {
                        var content = await _fsoService.GetFsoContentAsync(fso);
                        var listDTO = _fsoService.ToDTO(content);
                        return new JsonResult(listDTO);
                    }
                }*/

        [HttpGet("{id}")]
        public async Task<IActionResult> GetAsync(int id)
        {
            Thread.Sleep(3000);
            FileSystemObject fso = await _fsoService.GetFsoByIdAsync(id);
            User user = await _userService.GetUserFromPrincipalAsync(User);
            if (fso == null)
            {
                return NotFound();
            }
            if (!_fsoService.CheckOwner(fso, user))
            {
                return Forbid();
            }

            return Ok(_fsoService.ToDTO(fso));
        }

        [HttpPost("addfolder")]
        public async Task<IActionResult> AddAsync([FromBody] NewFolderModel model)
        {
            if (model == null || !model.IsFolder)
            {
                return BadRequest();
            }
            User user = await _userService.GetUserFromPrincipalAsync(User);
            if (user == null) return Unauthorized();

            FileSystemObject parent = await _fsoService.GetFsoByIdAsync(model.ParentId);
            if (parent.OwnerId != user.Id)
            {
                return Forbid();
            }
            var folder = new FileSystemObject
            {
                Date = DateTime.UtcNow,
                IsFolder = true,
                Name = model.Name,
                ParentId = model.ParentId,
                OwnerId = user.Id,
            };
            await _fsoService.AddFsoAsync(folder);
            return new JsonResult(new FileSystemObjectViewModel(folder));
        }

        [HttpPut("rename")]
        public async Task<IActionResult> RenameAsync([FromBody] FileSystemObject request)
        {
            FileSystemObject fso = await _fsoService.GetFsoByIdAsync(request.Id);
            User user = await _userService.GetUserFromPrincipalAsync(User);

            if (fso == null)
            {
                return NotFound();
            }
            if (! _fsoService.CheckOwner(fso, user))
            {
                return Forbid();
            }
            await _fsoService.UpdateFsoAsync(request);
            return Ok();
        }


        [HttpDelete("delete")]
        public async Task<IActionResult> DeleteAsync(string fsoIdcsv)
        {
            if (string.IsNullOrEmpty(fsoIdcsv))
            {
                return BadRequest();
            }
            var user = await _userService.GetUserFromPrincipalAsync(User);
            string[] fsoIdArr = fsoIdcsv.Split(',');

            foreach (var fsoId in fsoIdArr)
            {
                var fso = await _fsoService.GetFsoByIdAsync(int.Parse(fsoId));
                if (_fsoService.CheckOwner(fso, user))
                {
                    await _fsoService.DeleteFsoAsync(fso, user);
                }
            }
            return Ok();
        }
        [HttpPost("move")]
        public async Task<IActionResult> MoveAsync(string fsoIdcsv, string destinationDirId)
        {
            if (string.IsNullOrWhiteSpace(fsoIdcsv))
            {
                return BadRequest();
            }
            var user = await _userService.GetUserFromPrincipalAsync(User);

            var destination = await _fsoService.GetFsoByIdAsync(int.Parse(destinationDirId));
            if (!_fsoService.CheckOwner(destination, user))
            {
                return Forbid();
            }
            string[] fsoIdArr = fsoIdcsv.Split(',');

            var successList = new List<FileSystemObjectViewModel>();
            var failList = new List<FileSystemObjectViewModel>();
            foreach (var fsoId in fsoIdArr)
            {
                var fso = await _fsoService.GetFsoByIdAsync(int.Parse(fsoId));
                if (_fsoService.CheckOwner(fso, user))
                {
                    try
                    {
                        await _fsoService.MoveFsoAsync(fso, destination);
                        successList.Add(_fsoService.ToDTO(fso));
                    }
                    catch (FsoException)
                    {
                        failList.Add(_fsoService.ToDTO(fso));
                    }

                }
            }
            return Ok(new { success = successList, fail = failList });
        }

        [HttpPost("upload"), DisableRequestSizeLimit]
        public async Task<IActionResult> UploadAsync()
        {
            var parentId = Request.Form["rootId"];
            var root = await _fsoService.GetFsoByIdAsync(int.Parse(parentId));
            var user = await _userService.GetUserFromPrincipalAsync(User);
            if (!_fsoService.CheckOwner(root, user))
            {
                return Forbid();
            }
            try
            {
                var files = Request.Form.Files;
                var result = new List<FileSystemObjectViewModel>();
                foreach (var file in files)
                {
                    var fileName = await _fsoService.CreateFileAsync(file, user);
                    var fsoName = ContentDispositionHeaderValue.Parse(file.ContentDisposition).FileName.Trim('"');
                    var fso = await _fsoService.CreateFsoAsync(fsoName, fileName, file.Length, false, root.Id, user.Id);
                    result.Add(_fsoService.ToDTO(fso));
                }
                return new JsonResult(result);

            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error : {ex}");
            }
        }

        [HttpPost("download")]
        public async Task<IActionResult> DownloadAsync()
        {
            var fsoIdcsv = Request.Form["fsoIdcsv"].ToString();
            var user = await _userService.GetUserFromPrincipalAsync(User);
            if (string.IsNullOrEmpty(fsoIdcsv))
            {
                return BadRequest();
            }
            int[] fsoIdArray = Array.ConvertAll(fsoIdcsv.Split(','), int.Parse);
            var fsoList = await _fsoService.GetFsoListByIdAsync(fsoIdArray);
            var root = await _fsoService.CheckParentFso(fsoList);
            if (root == null || !_fsoService.CheckOwner(root, user))
            {
                return Forbid();
            }

            string contentType;
            if (fsoList.Count == 1 && !fsoList[0].IsFolder)
            {
                contentType = FsoService.GetMimeType(Path.GetExtension(fsoList[0].Name));
            }
            else
            {
                contentType = FsoService.GetMimeType(".zip");
            }
            var extension = Path.GetExtension(fsoList[0].Name);

            var stream = await _fsoService.GetFileAsync(root, fsoList, user);

            return File(stream, contentType);
        }

        private ObjectResult ReturnStatusCode(Exception ex)
        {
            var keys = ex.Data.Keys;
            var statusCode = ex.Data.Keys.Cast<string>().Single();
            var statusMessage = ex.Data[statusCode].ToString();
            return StatusCode(int.Parse(statusCode), statusMessage);
        }
    }

    public class NewFolderModel
    {
        public string Name { get; set; }
        public int ParentId { get; set; }

        public bool IsFolder { get; set; }
    }
}
