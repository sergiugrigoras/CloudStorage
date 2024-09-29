using CloudStorage.Interfaces;
using CloudStorage.Interfaces.Expense;
using CloudStorage.Models;
using CloudStorage.Services;
using CloudStorage.ViewModels.Expense;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CloudStorage.Controllers.Expense;

[Authorize]
[Route("api/expense")]
[ApiController]
public class ExpenseController(IUserService userService, IExpenseService expenseService) : ControllerBase
{
    private readonly IUserService _userService = userService ?? throw new ArgumentNullException(nameof(userService));
    private readonly IExpenseService _expenseService = expenseService ?? throw new ArgumentNullException(nameof(expenseService));

    [HttpGet]
    public async Task<IActionResult> GetExpensesAsync([FromQuery] ExpenseFilter filter)
    {
        var user = await _userService.GetUserAsync(User);
        if (user == null) return Unauthorized();
        filter.UserId = user.Id;
        var result = await _expenseService.GetExpensesAsync(filter);
        return new JsonResult(result.Select(x => new ExpenseViewModel(x)));
    }

    [HttpPost]
    public async Task<IActionResult> AddExpenseAsync([FromBody] ExpenseViewModel viewModel)
    {
        var user = await _userService.GetUserAsync(User);
        if (user == null) return Unauthorized();
        try
        {
            var expense = _expenseService.CreateExpense(viewModel.Amount, viewModel.Description, viewModel.Date, user.Id, viewModel.CategoryId, viewModel.PaymentMethodId);
            var result = await _expenseService.AddExpenseAsync(expense);
            return new JsonResult(new ExpenseViewModel(result));
        }
        catch
        {
            return StatusCode(500);
        }
    }

    [HttpPut]
    public async Task<IActionResult> UpdateExpenseAsync([FromBody] ExpenseViewModel viewModel)
    {
        var user = await _userService.GetUserAsync(User);
        if (user == null) return Unauthorized();
        try
        {
            var expense = await _expenseService.GetExpenseAsync(viewModel.Id.GetValueOrDefault());
            if (expense == null || expense.UserId != user.Id) return BadRequest();
            expense.UpdateValues(viewModel.Description, viewModel.Amount, viewModel.Date, viewModel.CategoryId, viewModel.PaymentMethodId);
            await _expenseService.UpdateExpenseAsync(expense);
            return new JsonResult(new ExpenseViewModel(expense));
        }
        catch
        {
            return StatusCode(500);
        }
    }

    [HttpDelete]
    public async Task<IActionResult> DeleteExpenseAsync([FromQuery] Guid id)
    {
        var user = await _userService.GetUserAsync(User);
        if (user == null) return Unauthorized();
        try
        {
            var expense = await _expenseService.GetExpenseAsync(id);
            if (expense == null || expense.UserId != user.Id) return BadRequest();
            await _expenseService.DeleteExpenseAsync(expense);
            return Ok();
        }
        catch
        {
            return StatusCode(500);
        }
    }

    [HttpGet("suggest-category")]
    public async Task<IActionResult> GenerateCategoryAsync(string text)
    {
        var category = await _expenseService.SuggestCategoryIdAsync(text);
        return new JsonResult(category);
    }
}