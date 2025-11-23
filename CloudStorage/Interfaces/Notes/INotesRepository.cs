using CloudStorage.Models;

namespace CloudStorage.Interfaces.Notes;

public interface INotesRepository
{
    Task<Note> GetAsync(string id);
    Task<List<Note>> GetUserNotesAsync(Guid userId);
    Task CreateAsync(Note note);
    Task ReplaceAsync(Note note);
    Task<Note> UpdateAsync(NoteInputModel input, Guid userId);
    Task<Note> DeleteAsync(string id, Guid userId);
}