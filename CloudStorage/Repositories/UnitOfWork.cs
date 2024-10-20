using CloudStorage.Interfaces;
using CloudStorage.Models;

namespace CloudStorage.Repositories;

public abstract class UnitOfWork(AppDbContext context) : IUnitOfWork
{
    private AppDbContext Context { get; }= context;

    private bool _disposed = false;

    protected virtual void Dispose(bool disposing)
    {
        if (!_disposed)
        {
            if (disposing)
            {
                Context.Dispose();
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
        return await Context.SaveChangesAsync();
    }
}