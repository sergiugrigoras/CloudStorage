namespace CloudStorage.Models;

public class FileSystemObject
{
    public int Id { get; set; }

    public string Name { get; set; }

    public int? ParentId { get; set; }

    public bool IsFolder { get; set; }

    public string FileName { get; set; }

    public long? FileSize { get; set; }

    public DateTime Date { get; set; }

    public Guid OwnerId { get; set; }

    public virtual ICollection<FileSystemObject> Children { get; } = new List<FileSystemObject>();

    public virtual User Owner { get; set; }

    public virtual FileSystemObject Parent { get; set; }
        
    public bool CheckOwnership(Guid userId) => OwnerId == userId;
}

public class FsoException(string message) : Exception(message);