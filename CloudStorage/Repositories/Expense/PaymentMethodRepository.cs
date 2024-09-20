using CloudStorage.Interfaces.Expense;
using CloudStorage.Models;

namespace CloudStorage.Repositories.Expense;

public class PaymentMethodRepository(AppDbContext context) : Repository<PaymentMethod>(context), IPaymentMethodRepository
{
    
}