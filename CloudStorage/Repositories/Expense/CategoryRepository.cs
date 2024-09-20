using CloudStorage.Interfaces;
using CloudStorage.Models;

namespace CloudStorage.Repositories.Expense;

public class CategoryRepository(AppDbContext context) : Repository<Category>(context), ICategoryRepository
{
    
}