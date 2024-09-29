using CloudStorage.Models;
using CloudStorage.ViewModels;
using CloudStorage.ViewModels.Expense;

namespace CloudStorage.Interfaces.Expense;

public interface IExpenseService
{
    Models.Expense CreateExpense(decimal amount, string description, DateTime date, Guid userId, Guid categoryId, Guid paymentMethodId); 
    Task<Models.Expense> AddExpenseAsync(Models.Expense expense);
    Task<Models.Expense> UpdateExpenseAsync(Models.Expense expense);
    Task DeleteExpenseAsync(Models.Expense expense);
    Task DeleteExpenseAsync(Guid id);
    Task<IEnumerable<Models.Expense>> GetExpensesAsync(ExpenseFilter filter);
    
    Task<Category> AddUserCategoryAsync(Category category);
    Task<Category> UpdateUserCategoryAsync(Category category);
    Task DeleteUserCategoryAsync(Category category);
    Task DeleteUserCategoryAsync(Guid id);
    Task<IEnumerable<Category>> GetCategoriesAsync();
    Task<IEnumerable<Category>> GetUserCategoriesAsync(CategoryFilter filter);
    Task<Category> GetCategoryAsync(Guid id);

    Task<PaymentMethod> AddPaymentMethodAsync(PaymentMethod paymentMethod);
    Task<PaymentMethod> UpdatePaymentMethodAsync(PaymentMethod paymentMethod);
    Task<PaymentMethod> GetPaymentMethodAsync(Guid id);
    Task<IEnumerable<PaymentMethod>> GetPaymentMethodsAsync(PaymentMethodFilter filter);

    Task<Guid?> SuggestCategoryIdAsync(string text);
}