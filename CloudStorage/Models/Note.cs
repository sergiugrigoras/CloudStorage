using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace CloudStorage.Models;

public class Note
{
    [BsonId]
    public ObjectId Id { get; set; }

    [BsonRepresentation(BsonType.String)]
    public Guid UserId { get; set; }

    public NoteType Type { get; set; }

    public string Title { get; set; }

    public string Text { get; set; }

    public DateTime? CreationDate { get; set; }

    public DateTime? ModificationDate { get; set; }


    public List<ChecklistItem> Checklist { get; set; } = [];
}

public enum NoteType
{
    Text = 1,
    List = 2,
}

public class ChecklistItem
{
    public string Label { get; set; }
    public bool Checked { get; set; }

    public static ChecklistItem Clone(ChecklistItem item) =>
        new() { Label = item.Label, Checked = item.Checked };
}

public class NoteInputModel
{
    public string Id { get; set; }
    public NoteType Type { get; set; }
    public string Title { get; set; }
    public string Text { get; set; }
    public List<ChecklistItem> Checklist { get; set; }
    
    public static Note ToDomain(NoteInputModel note)
    {
        if (note == null) return null;
        return new Note
        {
            Id = ObjectId.TryParse(note.Id, out var id) ? id : ObjectId.Empty,
            Type = note.Type,
            Title = note.Title,
            Text = note.Type != NoteType.Text ? null : note.Text,
            Checklist =
                note.Type != NoteType.List
                    ? null
                    : (note.Checklist ?? [])
                    .Select(ChecklistItem.Clone)
                    .ToList()
        };
    }
}

public class NoteViewModel
{
    public string Id { get; set; }
    public NoteType Type { get; set; }
    public string Title { get; set; }
    public string Text { get; set; }
    public List<ChecklistItem> Checklist { get; set; }
    public DateTime? CreationDate { get; set; }
    public DateTime? ModificationDate { get; set; }
    public static NoteViewModel FromDomain(Note note)
    {
        if (note == null) return null;
        return new NoteViewModel
        {
            Id = note.Id.ToString(),
            Type = note.Type,
            Title = note.Title,
            Text = note.Type != NoteType.Text ? null : note.Text,
            CreationDate = note.CreationDate,
            ModificationDate = note.ModificationDate,
            Checklist =
                note.Type != NoteType.List
                    ? null
                    : (note.Checklist ?? [])
                    .Select(ChecklistItem.Clone)
                    .ToList(),
        };
    }
}