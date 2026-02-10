using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using CloudStorage.Interfaces;
using CloudStorage.Models.Expense;
using CloudStorage.Repositories.Expense;
using MongoDB.Bson;

namespace CloudStorage.Services;

public interface IExpenseService
{
    ExpenseEntry CreateExpense(decimal amount, string description, DateTime date, string categoryId, string paymentMethodId); 
    Task<ExpenseEntry> AddExpenseAsync(ExpenseEntry expenseEntry);
    Task<ExpenseEntry> UpdateExpenseAsync(ExpenseEntry expenseEntry);
    Task DeleteExpenseAsync(ObjectId id);
    Task<List<ExpenseEntry>> GetExpensesAsync(ExpenseFilter filter);
    
    Task<Category> AddUserCategoryAsync(Category category);
    Task<Category> UpdateUserCategoryAsync(Category category);
    Task DeleteUserCategoryAsync(ObjectId id);
    Task<List<Category>> GetCategoriesAsync();
    
    Task<PaymentMethod> AddPaymentMethodAsync(PaymentMethod paymentMethod);
    Task<PaymentMethod> UpdatePaymentMethodAsync(PaymentMethod paymentMethod);
    Task<List<PaymentMethod>> GetPaymentMethodsAsync();

    Task<string> SuggestCategoryIdAsync(string text);
}

public partial class ExpenseService(ICurrentUser currentUser, IGeminiService geminiService, ICategoryRepository categoryRepository, IPaymentMethodRepository paymentMethodRepository, IExpenseRepository expenseRepository) : IExpenseService
{
    private readonly ICurrentUser _currentUser =  currentUser ?? throw new ArgumentNullException(nameof(currentUser));
    private readonly IGeminiService _geminiService = geminiService ?? throw new ArgumentNullException(nameof(geminiService));
    private readonly ICategoryRepository _categoryRepository = categoryRepository ?? throw new ArgumentNullException(nameof(categoryRepository));
    private readonly IPaymentMethodRepository _paymentMethodRepository = paymentMethodRepository ?? throw new ArgumentNullException(nameof(paymentMethodRepository));
    private readonly IExpenseRepository _expenseRepository = expenseRepository ?? throw new ArgumentNullException(nameof(expenseRepository));

    public ExpenseEntry CreateExpense(decimal amount, string description, DateTime date, string categoryId,
        string paymentMethodId)
    {
        return new ExpenseEntry
        {
            Description = description,
            CategoryId = ObjectId.TryParse(categoryId, out var catId) ? catId : ObjectId.Empty,
            PaymentMethodId = ObjectId.TryParse(paymentMethodId, out var pmId) ? pmId : ObjectId.Empty,
            Amount = amount,
            Date = date.Date,
        };
    }

    public async Task<ExpenseEntry> AddExpenseAsync(ExpenseEntry expenseEntry)
    {
        await _expenseRepository.CreateAsync(expenseEntry, _currentUser.UserId);
        return expenseEntry;
    }

    public Task<ExpenseEntry> UpdateExpenseAsync(ExpenseEntry expenseEntry) =>
        _expenseRepository.UpdateAsync(expenseEntry, _currentUser.UserId);

    public async Task DeleteExpenseAsync(ObjectId id) => await _expenseRepository.DeleteAsync(id, _currentUser.UserId);

    public Task<List<ExpenseEntry>> GetExpensesAsync(ExpenseFilter filter) =>
        _expenseRepository.GetManyAsync(filter, _currentUser.UserId);
    
    public Task<List<Category>> GetCategoriesAsync() => _categoryRepository.GetForUserAsync(_currentUser.UserId);

    public Task<Category> GetCategoryAsync(ObjectId id, Guid userId) => _categoryRepository.GetAsync(id, userId);

    public async Task<Category> AddUserCategoryAsync(Category category)
    {
        await _categoryRepository.CreateAsync(category, _currentUser.UserId);
        return category;
    }

    public Task<Category> UpdateUserCategoryAsync(Category category) =>
        _categoryRepository.UpdateAsync(category, _currentUser.UserId);

    public Task DeleteUserCategoryAsync(ObjectId id) => _categoryRepository.DeleteAsync(id, _currentUser.UserId);
    
    public async Task<PaymentMethod> AddPaymentMethodAsync(PaymentMethod paymentMethod)
    {
        await _paymentMethodRepository.CreateAsync(paymentMethod, _currentUser.UserId);
        return paymentMethod;
    }

    public Task<PaymentMethod> UpdatePaymentMethodAsync(PaymentMethod paymentMethod) =>
        _paymentMethodRepository.UpdateAsync(paymentMethod, _currentUser.UserId);

    public Task<List<PaymentMethod>> GetPaymentMethodsAsync() =>
        _paymentMethodRepository.GetForUserAsync(_currentUser.UserId);

    public async Task<string> SuggestCategoryIdAsync(string text)
    {
        var categories = await _categoryRepository.GetAsync();
        
        var categoryMap = categories
            .Select((value, index) => new { index, value })
            .ToDictionary(x => x.index.ToString(), x => x.value);
        
        var joinedCategories =
            string.Join(Environment.NewLine, categoryMap.Select(kvp => $"{kvp.Key} {kvp.Value.Name}"));
        var prompt = $"""
                      This is a list or categories with Id and Name:
                      {joinedCategories}
                      What is the best category for the following expense: {text} ?
                      Reply only with the category Id
                      """;
        try
        {
            var geminiResponse = await _geminiService.SendRequestAsync(prompt);
            var part = geminiResponse.Candidates.FirstOrDefault()?.Content.Parts.FirstOrDefault();
            var id = NewLineRegex().Replace(part?.Text ?? string.Empty, "");

            return categoryMap.TryGetValue(id, out var category) ? category.Id.ToString() : null;
        }
        catch
        {
            return null;
        }
        
    }

    [GeneratedRegex(@"\t|\n|\r")]
    private static partial Regex NewLineRegex();
}