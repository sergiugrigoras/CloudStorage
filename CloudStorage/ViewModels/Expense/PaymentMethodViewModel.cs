using CloudStorage.Models;

namespace CloudStorage.ViewModels.Expense;

public class PaymentMethodViewModel
{
    public PaymentMethodViewModel() {}
    public PaymentMethodViewModel(PaymentMethod paymentMethod)
    {
        Id = paymentMethod.Id;
        Name = paymentMethod.Name;
        IsActive = paymentMethod.IsActive;
        UserId = paymentMethod.UserId;
    }
    public Guid? Id { get; set; }
    public string Name { get; set; }
    public bool IsActive { get; set; }
    public Guid? UserId { get; set; }
    
}