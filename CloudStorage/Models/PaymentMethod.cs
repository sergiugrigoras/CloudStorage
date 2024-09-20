namespace CloudStorage.Models;

public class PaymentMethod
{
    public Guid Id { get; set; }
    public string Name { get; set; }
    public bool IsActive { get; set; }
    public Guid UserId { get; set; }
    public User User { get; set; }
    public ICollection<Expense> Expenses { get; set; } = [];
}