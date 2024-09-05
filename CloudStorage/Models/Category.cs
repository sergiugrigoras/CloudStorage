namespace CloudStorage.Models;

public class Category
{
    public Guid Id { get; set; }
    public string Name { get; set; }
    public ICollection<Expense> Expenses { get; set; } = [];
}