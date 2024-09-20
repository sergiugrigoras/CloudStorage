using CloudStorage.Interfaces.Expense;
using CloudStorage.Models;
using Microsoft.EntityFrameworkCore;

namespace CloudStorage.Repositories.Expense;

public class ExpenseRepository(AppDbContext context) : Repository<Models.Expense>(context), IExpenseRepository
{
}