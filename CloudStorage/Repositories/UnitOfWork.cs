using CloudStorage.Interfaces;
using CloudStorage.Models;

namespace CloudStorage.Repositories;

public class UnitOfWork(AppDbContext context) : IUnitOfWork
{
    private bool _disposed = false;

    protected virtual void Dispose(bool disposing)
    {
        if (!_disposed)
        {
            if (disposing)
            {
                context.Dispose();
            }
        }
        _disposed = true;
    }
    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }

    public async Task<int> SaveAsync()
    {
        return await context.SaveChangesAsync();
    }
}