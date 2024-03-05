using System.Security.Cryptography;
using CloudStorage.Models;
using CloudStorage.ViewModels;
using Microsoft.EntityFrameworkCore;

namespace CloudStorage.Services;

public interface INoteService
{
    Task<ICollection<Note>> GetUserNotesAsync(Guid userId);
    Task<Note> GetByIdAsync(int id);
    Task<Note> CreateAsync(NoteViewModel note, Guid userId);
    Task<Note> UpdateAsync(NoteViewModel note);
    Task DeleteAsync(Note note);
    
}
public class NoteService(AppDbContext context) : INoteService
{
    public async Task<ICollection<Note>> GetUserNotesAsync(Guid userId) => await context.Notes
        .Where(x => x.UserId == userId)
        .ToArrayAsync();
    
    public async Task<Note> GetByIdAsync(int id) => await context.Notes.FindAsync(id);
    
    public async Task<Note> CreateAsync(NoteViewModel note, Guid userId)
    {
        var model = new Note
        {
            Title = note.Title,
            Body = note.Body,
            UserId = userId,
            CreationDate = DateTime.UtcNow,
            Type = note.Type
        };
        await context.Notes.AddAsync(model);
        await context.SaveChangesAsync();
        return model;
    }
    
    public async Task<Note> UpdateAsync(NoteViewModel note)
    {
        var model = await GetByIdAsync(note.Id);
        if (model == null) return null;
        model.Title = note.Title;
        model.Body = note.Body;
        model.Color = note.Color;
        model.ModificationDate = DateTime.UtcNow;
        await context.SaveChangesAsync();
        return model;
    }

    public async Task DeleteAsync(Note note)
    {
        context.Notes.Remove(note);
        await context.SaveChangesAsync();
    }
}