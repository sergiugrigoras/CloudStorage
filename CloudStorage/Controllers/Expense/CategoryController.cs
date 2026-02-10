using CloudStorage.Extensions;
using CloudStorage.Models.Expense;
using CloudStorage.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Bson;

namespace CloudStorage.Controllers.Expense;

[Authorize]
[Route("api/expense/category")]
[ApiController]
public class CategoryController(IExpenseService expenseService)  : ControllerBase
{
    private readonly IExpenseService _expenseService = expenseService ?? throw new ArgumentNullException(nameof(expenseService));
    
    [HttpGet]
    public async Task<IActionResult> GetCategoriesAsync()
    {
        try
        {
            var categories = await _expenseService.GetCategoriesAsync();
            var result = categories.Select(CategoryViewModel.FromDomain);
            return Ok(result);
        }
        catch (Exception)
        {
            return StatusCode(500, "An unexpected error occurred.");
        }
    }

    [HttpPost]
    public async Task<IActionResult> AddCategoryAsync([FromBody] CategoryViewModel categoryViewModel)
    {
        if (string.IsNullOrWhiteSpace(categoryViewModel?.Name)) return BadRequest();
        try
        {
            var category = new Category
                { Name = categoryViewModel.Name, Emoji = categoryViewModel.Emoji };
            var result = await _expenseService.AddUserCategoryAsync(category);
            return Ok(CategoryViewModel.FromDomain(result));
        }
        catch
        {
            return StatusCode(500, "An unexpected error occurred.");
        }
    }
    
    [HttpPut]
    public async Task<IActionResult> UpdateCategoryAsync([FromBody] CategoryViewModel categoryViewModel)
    {
        if (categoryViewModel == null) return BadRequest();
        try
        {
            var update = new Category
            {
                Id = ObjectId.TryParse(categoryViewModel.Id, out var id) ? id: ObjectId.Empty,
                Name = categoryViewModel.Name,
                Emoji = categoryViewModel.Emoji,
            };
            var result = await _expenseService.UpdateUserCategoryAsync(update);
            return Ok(CategoryViewModel.FromDomain(result));
        }
        catch
        {
            return StatusCode(500, "An unexpected error occurred.");
        }
    }

    [HttpDelete]
    public async Task<IActionResult> DeleteCategoryAsync([FromQuery] string id)
    {
        if (!ObjectId.TryParse(id, out var categoryId)) 
            return BadRequest("Invalid id");
        try
        {
            await _expenseService.DeleteUserCategoryAsync(categoryId);
            return NoContent();
        }
        catch
        {
            return StatusCode(500, "An unexpected error occurred.");
        }
    }
    
    [HttpGet("suggest")]
    public async Task<IActionResult> GenerateCategoryAsync(string text)
    {
        var category = await _expenseService.SuggestCategoryIdAsync(text);
        return new JsonResult(category);
    }
}