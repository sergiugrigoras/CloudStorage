namespace CloudStorage.Interfaces.Expense;

public interface IExpenseUnitOfWork : IUnitOfWork
{
    IExpenseRepository Expenses { get; }
    ICategoryRepository Categories { get; }
    IPaymentMethodRepository PaymentMethods { get; }
}