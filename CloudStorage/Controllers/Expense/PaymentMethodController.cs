using CloudStorage.Interfaces.Expense;
using CloudStorage.Models;
using CloudStorage.Services;
using CloudStorage.ViewModels.Expense;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CloudStorage.Controllers.Expense;

[Authorize]
[Route("api/payment-method")]
[ApiController]
public class PaymentMethodController(IUserService userService, IExpenseService expenseService)  : ControllerBase
{
    private readonly IUserService _userService = userService ?? throw new ArgumentNullException(nameof(userService));
    private readonly IExpenseService _expenseService = expenseService ?? throw new ArgumentNullException(nameof(expenseService));
    
    [HttpGet]
    public async Task<IActionResult> GetPaymentMethodsAsync()
    {
        var user = await _userService.GetUserAsync(User);
        if (user == null) return Unauthorized();
        var filter = new PaymentMethodFilter
        {
            UserId = user.Id,
        };
        var result =await _expenseService.GetPaymentMethodsAsync(filter);
        return new JsonResult(result.Select(x => new PaymentMethodViewModel(x)));
    }

    [HttpPost]
    public async Task<IActionResult> AddPaymentMethodAsync([FromBody] PaymentMethodViewModel paymentMethodViewModel)
    {
        var user = await _userService.GetUserAsync(User);
        if (user == null) return Unauthorized();
        if (string.IsNullOrWhiteSpace(paymentMethodViewModel?.Name)) return BadRequest();
        var paymentMethod = new PaymentMethod
        {
            Id = Guid.NewGuid(),
            Name = paymentMethodViewModel.Name,
            IsActive = paymentMethodViewModel.IsActive,
            UserId = user.Id
        };
        try
        {
            var result = await _expenseService.AddPaymentMethodAsync(paymentMethod);
            return new JsonResult(new PaymentMethodViewModel(result));
        }
        catch
        {
            return StatusCode(500);
        }
    }
    
    [HttpPut]
    public async Task<IActionResult> UpdatePaymentMethodAsync([FromBody] PaymentMethodViewModel paymentMethodViewModel)
    {
        var user = await _userService.GetUserAsync(User);
        if (user == null) return Unauthorized();
        if (paymentMethodViewModel == null) return BadRequest();
        var paymentMethod = await _expenseService.GetPaymentMethodAsync(paymentMethodViewModel.Id.GetValueOrDefault());
        if (paymentMethod == null || paymentMethod.UserId != user.Id) return BadRequest();
        try
        {
            paymentMethod.Name = paymentMethodViewModel.Name;
            paymentMethod.IsActive = paymentMethodViewModel.IsActive;
            var result = await _expenseService.UpdatePaymentMethodAsync(paymentMethod);
            return new JsonResult(new PaymentMethodViewModel(result));
        }
        catch
        {
            return StatusCode(500);
        }
    }
}