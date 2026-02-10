using CloudStorage.Extensions;
using CloudStorage.Models.Expense;
using CloudStorage.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Bson;

namespace CloudStorage.Controllers.Expense;

[Authorize]
[Route("api/expense")]
[ApiController]
public class ExpenseController(IExpenseService expenseService) : ControllerBase
{
    private readonly IExpenseService _expenseService = expenseService ?? throw new ArgumentNullException(nameof(expenseService));

    [HttpGet]
    public async Task<IActionResult> GetExpensesAsync([FromQuery] ExpenseFilter filter)
    {
        if (filter == null) return BadRequest("Invalid request.");
        try
        {
            var result = (await _expenseService.GetExpensesAsync(filter)).Select(ExpenseViewModel.FromDomain).ToArray();
            var paymentMethods = (await _expenseService.GetPaymentMethodsAsync()).Select(PaymentMethodViewModel.FromDomain)
                .ToDictionary(x => x.Id);
            var categories = (await _expenseService.GetCategoriesAsync()).Select(CategoryViewModel.FromDomain).ToDictionary(x => x.Id);

            foreach (var expense in result)
            {
                expense.PaymentMethod = paymentMethods.TryGetValue(expense.PaymentMethodId, out var paymentMethod) ? paymentMethod : null;
                expense.Category = categories.TryGetValue(expense.CategoryId, out var category) ? category : null;
            }
            return Ok(result);
        }
        catch (Exception)
        {
            return StatusCode(500, "An unexpected error occurred.");
        }
    }

    [HttpPost]
    public async Task<IActionResult> AddExpenseAsync([FromBody] ExpenseViewModel request)
    {
        try
        {
            var expense = _expenseService.CreateExpense(request.Amount, request.Description, request.Date, request.CategoryId, request.PaymentMethodId);
            var result = await _expenseService.AddExpenseAsync(expense);
            return Ok(ExpenseViewModel.FromDomain(result));
        }
        catch (Exception)
        {
            return StatusCode(500, "An unexpected error occurred.");
        }
    }

    [HttpPut]
    public async Task<IActionResult> UpdateExpenseAsync([FromBody] ExpenseViewModel request)
    {
        try
        {
            var result = await _expenseService.UpdateExpenseAsync(request?.ToDomain());
            return Ok(ExpenseViewModel.FromDomain(result));
        }
        catch (Exception)
        {
            return StatusCode(500, "An unexpected error occurred.");
        }
    }

    [HttpDelete]
    public async Task<IActionResult> DeleteExpenseAsync([FromQuery] string id)
    {
        if (!ObjectId.TryParse(id, out var expenseId))
            return BadRequest("Invalid id.");
        try
        {
            await _expenseService.DeleteExpenseAsync(expenseId);
            return NoContent();
        }
        catch (Exception)
        {
            return StatusCode(500, "An unexpected error occurred.");
        }
    }


}