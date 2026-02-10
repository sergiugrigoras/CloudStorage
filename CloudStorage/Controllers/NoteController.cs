using CloudStorage.Models;
using CloudStorage.Repositories.Notes;
using CloudStorage.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;


namespace CloudStorage.Controllers;

[Authorize]
[Route("api/[controller]")]
[ApiController]
public class NoteController(IUserService userService, INotesRepository notesRepository) : ControllerBase
{
    private readonly IUserService _userService = userService ?? throw new ArgumentNullException(nameof(userService));
    private readonly INotesRepository _notesRepository = notesRepository ?? throw new ArgumentNullException(nameof(notesRepository));
    
    [HttpGet]
    public async Task<IActionResult> GetUserNotesAsync()
    {
        try
        {
            var user = await _userService.GetUserAsync(User);
            if (user == null) return Unauthorized();
            var notes = await _notesRepository.GetUserNotesAsync(user.Id);
            return new JsonResult(notes.Select(NoteViewModel.FromDomain));
        }
        catch (Exception)
        {
            return StatusCode(500, "An unexpected error occurred.");
        }
    }

    [HttpPost]
    public async Task<IActionResult> CreateNoteAsync([FromBody] NoteInputModel noteInput)
    {
        try
        {
            if (noteInput == null) return BadRequest();
            var user = await _userService.GetUserAsync(User);
            if (user == null) return Unauthorized();
            var utcNow = DateTime.UtcNow;
            var note = NoteInputModel.ToDomain(noteInput, user.Id, utcNow, utcNow);
            await _notesRepository.CreateAsync(note);
            return new JsonResult(NoteViewModel.FromDomain(note));
        }
        catch (Exception)
        {
            return StatusCode(500, "An unexpected error occurred.");
        }
    }

    [HttpPut]
    public async Task<IActionResult> UpdateNoteAsync([FromBody] NoteInputModel noteInput)
    {
        try
        {
            if (noteInput == null) return BadRequest();
            var user = await _userService.GetUserAsync(User);
            if (user == null) return Unauthorized();
            var update = await _notesRepository.UpdateAsync(noteInput, user.Id);
            if (update == null) return NotFound();
            
            return new JsonResult(NoteViewModel.FromDomain(update));
        }
        catch (Exception)
        {
            return StatusCode(500, "An unexpected error occurred.");
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteNote(string id)
    {
        try
        {
            var user = await _userService.GetUserAsync(User);
            if (user == null) return Unauthorized();
            
            var result = await _notesRepository.DeleteAsync(id, user.Id);
            if (result == null) return NotFound();
            return Ok();
        }
        catch (Exception)
        {
            return StatusCode(500, "An unexpected error occurred.");
        }
    }
}