using CloudStorage.Extensions;
using CloudStorage.Models.Expense;
using CloudStorage.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Bson;

namespace CloudStorage.Controllers.Expense;

[Authorize]
[Route("api/expense/payment-method")]
[ApiController]
public class PaymentMethodController(IExpenseService expenseService)  : ControllerBase
{
    private readonly IExpenseService _expenseService = expenseService ?? throw new ArgumentNullException(nameof(expenseService));
    
    [HttpGet]
    public async Task<IActionResult> GetPaymentMethodsAsync()
    {
        try
        {
            var result =await _expenseService.GetPaymentMethodsAsync();
            return Ok(result.Select(PaymentMethodViewModel.FromDomain));
        }
        catch (Exception)
        {
            return StatusCode(500, "An unexpected error occurred.");
        }
    }

    [HttpPost]
    public async Task<IActionResult> AddPaymentMethodAsync([FromBody] PaymentMethodViewModel paymentMethodViewModel)
    {
        if (string.IsNullOrWhiteSpace(paymentMethodViewModel?.Name))
            return BadRequest("Invalid name");
        var paymentMethod = new PaymentMethod
        {
            Name = paymentMethodViewModel.Name,
            IsActive = paymentMethodViewModel.IsActive,
        };
        try
        {
            var result = await _expenseService.AddPaymentMethodAsync(paymentMethod);
            return Ok(PaymentMethodViewModel.FromDomain(result));
        }
        catch (Exception)
        {
            return StatusCode(500, "An unexpected error occurred.");
        }
    }
    
    [HttpPut]
    public async Task<IActionResult> UpdatePaymentMethodAsync([FromBody] PaymentMethodViewModel paymentMethodViewModel)
    {
        if (paymentMethodViewModel == null) return BadRequest();
        try
        {
            var update = new PaymentMethod
            {
                Id = ObjectId.TryParse(paymentMethodViewModel.Id,  out var id) ? id : ObjectId.Empty,
                Name = paymentMethodViewModel.Name,
                IsActive = paymentMethodViewModel.IsActive,
            };
            var result = await _expenseService.UpdatePaymentMethodAsync(update);
            return Ok(PaymentMethodViewModel.FromDomain(result));
        }
        catch (Exception)
        {
            return StatusCode(500, "An unexpected error occurred.");
        }
    }
}