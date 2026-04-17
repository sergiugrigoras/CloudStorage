using CloudStorage.Models;
using CloudStorage.Repositories.Note;
using MongoDB.Bson;

namespace CloudStorage.Services;

public interface INoteService
{
    Task CreateAsync(Note note);
    Task<List<Note>> GetAsync();
    Task<Note> UpdateAsync(Note note);
    Task DeleteAsync(string id);
}

public class NoteService(ICurrentUser currentUser, INoteRepository noteRepository) : INoteService
{
    private readonly ICurrentUser _currentUser =  currentUser ?? throw new ArgumentNullException(nameof(currentUser));
    private readonly INoteRepository _noteRepository = noteRepository ?? throw new ArgumentNullException(nameof(noteRepository));

    public Task CreateAsync(Note note) => _noteRepository.CreateAsync(note, _currentUser.UserId);
    public Task<List<Note>> GetAsync() => _noteRepository.GetUserNotesAsync(_currentUser.UserId);
    public Task<Note> UpdateAsync(Note note) => _noteRepository.UpdateAsync(note, _currentUser.UserId);
    public Task DeleteAsync(string id) => _noteRepository.DeleteAsync(id, _currentUser.UserId);
}