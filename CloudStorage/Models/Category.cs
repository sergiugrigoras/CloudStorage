namespace CloudStorage.Models;

public class Category
{
    public Guid Id { get; set; }
    public string Name { get; set; }
    public string Emoji { get; set; }
    public Guid? UserId { get; set; }
    public User User { get; set; }
    public ICollection<Expense> Expenses { get; set; } = [];
}