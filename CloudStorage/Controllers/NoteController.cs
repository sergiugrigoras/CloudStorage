using CloudStorage.Models;
using CloudStorage.Services;
using CloudStorage.ViewModels;
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

    
    [HttpGet("all")]
    public async Task<IActionResult> GetNotesAsync()
    {
        var user = await _userService.GetUserAsync(User);
        if (user == null) return Unauthorized();
        var notes = await _noteService.GetUserNotesAsync(user.Id);

        return new JsonResult(notes.Select(x => new NoteViewModel(x)));
    }

    [HttpPost]
    public async Task<IActionResult> CreateNoteAsync([FromBody] NoteViewModel note)
    {
        var user = await _userService.GetUserAsync(User);
        if (user == null) return Unauthorized();
        var model = await _noteService.CreateAsync(note, user.Id);
        return new JsonResult(new NoteViewModel(model));
    }

    [HttpPut]
    public async Task<IActionResult> UpdateNoteAsync([FromBody] NoteViewModel note)
    {
        var model = await _noteService.GetByIdAsync(note.Id);
        var user = await _userService.GetUserAsync(User);
        if (user == null) return Unauthorized();
        if (model == null) return NotFound();
        if (model.UserId != user.Id) return Forbid();
        var result = await _noteService.UpdateAsync(note);

        return new JsonResult(new NoteViewModel(result));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteNote(int id)
    {
        var model = await _noteService.GetByIdAsync(id);
        var user = await _userService.GetUserAsync(User);
        if (model == null) return NotFound();
        if (user == null) return Unauthorized();
        if (model.UserId != user.Id) return Forbid();
        
        await _noteService.DeleteAsync(model);
        return Ok();
    }
}