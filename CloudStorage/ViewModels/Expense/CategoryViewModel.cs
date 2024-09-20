using CloudStorage.Models;

namespace CloudStorage.ViewModels.Expense;

public class CategoryViewModel
{
    public CategoryViewModel() {}
    
    public CategoryViewModel(Category category)
    {
        Id = category.Id;
        Name = category.Name;
        Emoji = category.Emoji;
        UserId = category.UserId;
    }
    public Guid? Id { get; set; }
    public string Name { get; set; }
    public string Emoji { get; set; }
    public Guid? UserId { get; set; }
    
}