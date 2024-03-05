namespace CloudStorage.Models;

public  class Note
{
    public int Id { get; set; }

    public Guid UserId { get; set; }

    public string Type { get; set; }

    public string Title { get; set; }

    public string Body { get; set; }

    public DateTime CreationDate { get; set; }

    public DateTime? ModificationDate { get; set; }

    public string Color { get; set; }
    
    public virtual User User { get; set; }
}