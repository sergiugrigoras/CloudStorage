using CloudStorage.Interfaces.Expense;
using CloudStorage.Models;
using CloudStorage.Services;
using CloudStorage.ViewModels.Expense;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CloudStorage.Controllers.Expense;

[Authorize]
[Route("api/category")]
[ApiController]
public class CategoryController(IUserService userService, IExpenseService expenseService)  : ControllerBase
{
    private readonly IUserService _userService = userService ?? throw new ArgumentNullException(nameof(userService));
    private readonly IExpenseService _expenseService = expenseService ?? throw new ArgumentNullException(nameof(expenseService));
    
    [HttpGet]
    public async Task<IActionResult> GetCategoriesAsync()
    {
        var user = await _userService.GetUserAsync(User);
        if (user == null) return Unauthorized();
        var categories = await _expenseService.GetCategoriesAsync();
        var userCategories = await _expenseService.GetUserCategoriesAsync(new CategoryFilter{UserId = user.Id});
        var result = categories.Union(userCategories).Select(x => new CategoryViewModel(x));
        return new JsonResult(result);
    }

    [HttpPost]
    public async Task<IActionResult> AddCategoryAsync([FromBody] CategoryViewModel categoryViewModel)
    {
        var user = await _userService.GetUserAsync(User);
        if (user == null) return Unauthorized();
        if (string.IsNullOrWhiteSpace(categoryViewModel?.Name)) return BadRequest();
        var category = new Category
        {
            Id = Guid.NewGuid(),
            Name = categoryViewModel.Name,
            Emoji = categoryViewModel.Emoji,
            UserId = user.Id,
        };
        try
        {
            var result = await _expenseService.AddUserCategoryAsync(category);
            return new JsonResult(new CategoryViewModel(result));
        }
        catch
        {
            return StatusCode(500);
        }
    }
    
    [HttpPut]
    public async Task<IActionResult> UpdateCategoryAsync([FromBody] CategoryViewModel categoryViewModel)
    {
        var user = await _userService.GetUserAsync(User);
        if (user == null) return Unauthorized();
        if (categoryViewModel == null) return BadRequest();
        var category = await _expenseService.GetCategoryAsync(categoryViewModel.Id.GetValueOrDefault());
        if (category == null || category.UserId != user.Id) return BadRequest();
        try
        {
            category.Name = categoryViewModel.Name;
            category.Emoji = categoryViewModel.Emoji;
            var result = await _expenseService.UpdateUserCategoryAsync(category);
            return new JsonResult(new CategoryViewModel(result));
        }
        catch
        {
            return StatusCode(500);
        }
    }

    [HttpDelete]
    public async Task<IActionResult> DeleteCategoryAsync([FromQuery] Guid id)
    {
        var user = await _userService.GetUserAsync(User);
        if (user == null) return Unauthorized();
        var category = await _expenseService.GetCategoryAsync(id);
        if (category == null || category.UserId != user.Id) return BadRequest();
        try
        {
            await _expenseService.DeleteUserCategoryAsync(category);
            return Ok();
        }
        catch
        {
            return StatusCode(500);
        }
    }
}