namespace CloudStorage.Interfaces;

public interface IUnitOfWork : IDisposable
{
    Task<int> SaveAsync();
}