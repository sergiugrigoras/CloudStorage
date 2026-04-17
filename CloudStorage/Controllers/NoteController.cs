using CloudStorage.Models;
using CloudStorage.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Bson;


namespace CloudStorage.Controllers;

[Authorize]
[Route("api/[controller]")]
[ApiController]
public class NoteController(INoteService noteService) : ControllerBase
{
    private readonly INoteService _noteService = noteService ?? throw new ArgumentNullException(nameof(noteService));
    
    [HttpGet]
    public async Task<IActionResult> GetUserNotesAsync()
    {
        try
        {
            var notes = await _noteService.GetAsync();
            return Ok(notes.Select(NoteViewModel.FromDomain));
        }
        catch (Exception)
        {
            return StatusCode(500, "An unexpected error occurred.");
        }
    }

    [HttpPost]
    public async Task<IActionResult> CreateNoteAsync([FromBody] NoteInputModel noteInput)
    { 
        if (noteInput == null) return BadRequest();
        try
        {
            var note = NoteInputModel.ToDomain(noteInput);
            await _noteService.CreateAsync(note);
            return Ok(NoteViewModel.FromDomain(note));
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
            var update = await _noteService.UpdateAsync(NoteInputModel.ToDomain(noteInput));
            if (update == null) return NotFound();
            
            return Ok(NoteViewModel.FromDomain(update));
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
            await _noteService.DeleteAsync(id);
            return NoContent();
        }
        catch (Exception)
        {
            return StatusCode(500, "An unexpected error occurred.");
        }
    }
}