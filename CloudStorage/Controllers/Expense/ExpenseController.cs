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
}