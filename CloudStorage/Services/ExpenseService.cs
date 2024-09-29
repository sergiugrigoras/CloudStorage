using System.Text.Json;
using System.Text.RegularExpressions;
using CloudStorage.Interfaces;
using CloudStorage.Interfaces.Expense;
using CloudStorage.Models;
using CloudStorage.ViewModels.Expense;

namespace CloudStorage.Services;

public partial class ExpenseService(IExpenseUnitOfWork unitOfWork, IGeminiService geminiService) : IExpenseService
{
    private readonly IGeminiService _geminiService = geminiService ?? throw new ArgumentNullException(nameof(geminiService));

    public Expense CreateExpense(decimal amount, string description, DateTime date, Guid userId, Guid categoryId,
        Guid paymentMethodId)
    {
        return new Expense
        {
            Id = Guid.NewGuid(),
            Description = description,
            UserId = userId,
            CategoryId = categoryId,
            PaymentMethodId = paymentMethodId,
            Amount = amount,
            Date = date.Date,
        };
    }

    public async Task<Expense> AddExpenseAsync(Expense expense)
    {
        await unitOfWork.Expenses.AddAsync(expense);
        await unitOfWork.SaveAsync();
        await unitOfWork.Expenses.LoadReferenceAsync(expense, e => e.Category);
        await unitOfWork.Expenses.LoadReferenceAsync(expense, e => e.PaymentMethod);
        return expense;
    }

    public async Task<Expense> UpdateExpenseAsync(Expense expense)
    {
        unitOfWork.Expenses.Update(expense);
        await unitOfWork.SaveAsync();
        await unitOfWork.Expenses.LoadReferenceAsync(expense, e => e.Category);
        await unitOfWork.Expenses.LoadReferenceAsync(expense, e => e.PaymentMethod);
        return expense;
    }

    public async Task DeleteExpenseAsync(Expense expense)
    {
        unitOfWork.Expenses.Delete(expense);
        await unitOfWork.SaveAsync();
    }

    public async Task DeleteExpenseAsync(Guid id)
    {
        var entity = await unitOfWork.Expenses.GetAsync(id);
        if (entity == null) return;
        unitOfWork.Expenses.Delete(entity);
        await unitOfWork.SaveAsync();
    }

    public Task<IEnumerable<Expense>> GetExpensesAsync(ExpenseFilter filter)
    {
        return unitOfWork.Expenses.GetAsync(filter.ToExpression(),"Category,PaymentMethod");
    }

    public async Task<IEnumerable<Category>> GetCategoriesAsync()
    {
        return await unitOfWork.Categories.GetAsync(x => x.UserId == null);
    }

    public async Task<IEnumerable<Category>> GetUserCategoriesAsync(CategoryFilter filter)
    {
        return await unitOfWork.Categories.GetAsync(filter.ToExpression());
    }

    public async Task<Category> GetCategoryAsync(Guid id)
    {
        return await unitOfWork.Categories.GetAsync(id);
    }

    public async Task<Category> AddUserCategoryAsync(Category category)
    {
        await unitOfWork.Categories.AddAsync(category);
        await unitOfWork.SaveAsync();
        return category;
    }

    public async Task<Category> UpdateUserCategoryAsync(Category category)
    {
        unitOfWork.Categories.Update(category);
        await unitOfWork.SaveAsync();
        return category;
    }

    public async Task DeleteUserCategoryAsync(Category category)
    {
        unitOfWork.Categories.Delete(category);
        await unitOfWork.SaveAsync();
    }

    public async Task DeleteUserCategoryAsync(Guid id)
    {
        var entity = await unitOfWork.Categories.GetAsync(id);
        if (entity == null) return;
        unitOfWork.Categories.Delete(entity);
        await unitOfWork.SaveAsync();
    }

    public Task<PaymentMethod> GetPaymentMethodAsync(Guid id)
    {
        return unitOfWork.PaymentMethods.GetAsync(id);
    }

    public async Task<PaymentMethod> AddPaymentMethodAsync(PaymentMethod paymentMethod)
    {
        await unitOfWork.PaymentMethods.AddAsync(paymentMethod);
        await unitOfWork.SaveAsync();
        return await unitOfWork.PaymentMethods.GetAsync(paymentMethod.Id);
    }

    public async Task<PaymentMethod> UpdatePaymentMethodAsync(PaymentMethod paymentMethod)
    {
        unitOfWork.PaymentMethods.Update(paymentMethod);
        await unitOfWork.SaveAsync();
        return await unitOfWork.PaymentMethods.GetAsync(paymentMethod.Id);
    }
    
    public Task<IEnumerable<PaymentMethod>> GetPaymentMethodsAsync(PaymentMethodFilter filter)
    {
        return unitOfWork.PaymentMethods.GetAsync(filter.ToExpression());
    }

    public async Task<Guid?> SuggestCategoryIdAsync(string text)
    {
        var categories = await GetCategoriesAsync();
        var categoriesList = categories.Select(x => new {Name = x.Name.Replace("&", "and"), x.Id}).ToArray();
        var serializedCategories = JsonSerializer.Serialize(categoriesList);
        var prompt = $"Here is a list or categories with Name and Id: {serializedCategories}. What is the best category for the following expense: {text}? Reply only with the category Id";
        try
        {
            var geminiResponse = await _geminiService.SendRequestAsync(prompt);
            var part = geminiResponse.Candidates.FirstOrDefault()?.Content.Parts.FirstOrDefault();
            var id = NewLineRegex().Replace(part?.Text ?? string.Empty, "");
            
            return Guid.TryParse(id, out var categoryId) ? categoryId : null;
        }
        catch
        {
            return null;
        }
        
    }

    [GeneratedRegex(@"\t|\n|\r")]
    private static partial Regex NewLineRegex();
}