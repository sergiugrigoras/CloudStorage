namespace CloudStorage.ViewModels.Expense;

public class ExpenseViewModel
{
    public ExpenseViewModel() {}

    public ExpenseViewModel(Models.Expense expense)
    {
        Id = expense.Id;
        Description = expense.Description;
        Amount = expense.Amount;
        Date = expense.Date;
        CategoryId = expense.CategoryId;
        UserId = expense.UserId;
        PaymentMethodId = expense.PaymentMethodId;
        Category = expense.Category != null ? new CategoryViewModel(expense.Category) : null;
        PaymentMethod = expense.PaymentMethod != null ? new PaymentMethodViewModel(expense.PaymentMethod) : null;
    }
    public Guid? Id { get; set; }
    public string Description { get; set; }
    public decimal Amount { get; set; }
    public DateTime Date { get; set; }
    public Guid CategoryId { get; set; }
    public CategoryViewModel Category { get; set; }
    public Guid? UserId { get; set; }
    public Guid PaymentMethodId { get; set; }
    public PaymentMethodViewModel PaymentMethod { get; set; }
}