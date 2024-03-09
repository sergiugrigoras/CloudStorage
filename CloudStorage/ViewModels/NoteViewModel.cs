using CloudStorage.Models;

namespace CloudStorage.ViewModels;

public class NoteViewModel
{
    public int Id { get; set; }

    public Guid UserId { get; set; }

    public string Type { get; set; }

    public string Title { get; set; }

    public string Body { get; set; }

    public DateTime CreationDate { get; set; }

    public DateTime? ModificationDate { get; set; }

    public string Color { get; set; }

    public NoteViewModel()
    {
    }

    public NoteViewModel(Note note)
    {
        Id = note.Id;
        UserId = note.UserId;
        Title = note.Title;
        Body = note.Body;
        CreationDate = DateTime.SpecifyKind(note.CreationDate, DateTimeKind.Utc);
        ModificationDate = note.ModificationDate.HasValue
            ? DateTime.SpecifyKind(note.ModificationDate.Value, DateTimeKind.Utc)
            : null;
        Color = note.Color;
        Type = note.Type;
    }
}