using CloudStorage.Models;
using CloudStorage.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;


namespace CloudStorage.Controllers;

[Authorize]
[Route("api/[controller]")]
[ApiController]
public class NoteController(IUserService userService, INoteService noteService) : ControllerBase
{
    private readonly IUserService _userService = userService ?? throw new ArgumentNullException(nameof(userService));
    private readonly INoteService _noteService = noteService ?? throw new ArgumentNullException(nameof(noteService));

    [HttpPost("{id:int}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetNoteAsync(int id, [FromBody] NoteShareKey shareKey)
    {
        var note = await _noteService.GetNoteByIdAsync(id);
        var user = await _userService.GetUserAsync(User);
        if (note == null)
        {
            return NotFound();
        }

        if (user == null && note.ShareKey == shareKey.Key || user != null && user.Id == note.UserId)
        {
            return new JsonResult(_noteService.ToDTO(note));
        }
        else
        {
            return Forbid();
        }
    }

    [HttpGet("getall")]
    public async Task<IActionResult> GetNotesAsync()
    {
        var user = await _userService.GetUserAsync(User);
        var notes = await _noteService.GetAllNotesByUserAsync(user);

        return new JsonResult(_noteService.ToDTO(notes));
    }

    [HttpPost("add")]
    public async Task<IActionResult> AddNote([FromBody] Note note)
    {
        var user = await _userService.GetUserAsync(User);
        await _noteService.CreateNoteAsync(note, user);
        return Ok(_noteService.ToDTO(note));
    }

    [HttpPut("update")]
    public async Task<IActionResult> UpdateNote([FromBody] Note request)
    {
        var note = await _noteService.GetNoteByIdAsync(request.Id);
        var user = await _userService.GetUserAsync(User);
        if (note == null)
        {
            return NotFound();
        }
        if (note.UserId != user.Id)
        {
            return Forbid();
        }
        await _noteService.UpdateNoteAsync(note, request.Title, request.Body);

        return Ok(_noteService.ToDTO(note));
    }

    [HttpDelete("delete/{id}")]
    public async Task<IActionResult> DeleteNote(int id)
    {
        var note = await _noteService.GetNoteByIdAsync(id);
        var user = await _userService.GetUserAsync(User);
        if (note == null)
        {
            return NotFound();
        }
        if (note.UserId != user.Id)
        {
            return Forbid();
        }
        await _noteService.DeleteNoteAsync(note);
        return Ok();
    }

    [HttpPost("share")]
    public async Task<IActionResult> ShareNoteAsync([FromBody] Note sharedNote)
    {
        var note = await _noteService.GetNoteByIdAsync(sharedNote.Id);
        var user = await _userService.GetUserAsync(User);
        if (note == null)
        {
            return NotFound();
        }
        if (note.UserId != user.Id)
        {
            return Forbid();
        }
        if (note.ShareKey == null)
        {
            await _noteService.AddShareKeyAsync(note);
        }
        return Ok(new { note.ShareKey });
    }
}