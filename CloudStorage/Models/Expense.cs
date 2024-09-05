namespace CloudStorage.Models;

public class Expense
{
    public Guid Id { get; set; }
    public string Description { get; set; }
    public decimal Amount { get; set; }
    public DateTime Date { get; set; }
    public Guid CategoryId { get; set; }
    public Category Category { get; set; }
    public Guid UserId { get; set; }
    public User User { get; set; }
    public Guid? PaymentMethodId { get; set; }
    public PaymentMethod PaymentMethod { get; set; }
}