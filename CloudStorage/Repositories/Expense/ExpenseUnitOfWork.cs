using CloudStorage.Interfaces;
using CloudStorage.Interfaces.Expense;
using CloudStorage.Models;

namespace CloudStorage.Repositories.Expense;

public class ExpenseUnitOfWork(
    AppDbContext context,
    IExpenseRepository expenseRepository,
    ICategoryRepository categoryRepository,
    IPaymentMethodRepository paymentMethodRepository) : UnitOfWork(context), IExpenseUnitOfWork
{
    public IExpenseRepository Expenses { get; } = expenseRepository;
    public ICategoryRepository Categories { get; } = categoryRepository;
    public IPaymentMethodRepository PaymentMethods { get; } = paymentMethodRepository;
}