using System.Linq.Expressions;
using CloudStorage.Interfaces;
using CloudStorage.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Metadata;

namespace CloudStorage.Repositories;

public class Repository<TEntity>(AppDbContext context) : IRepository<TEntity>
    where TEntity : class
{
    protected readonly AppDbContext _context = context;
    protected readonly DbSet<TEntity> _set = context.Set<TEntity>();
    
    public async Task<TEntity> GetAsync(Guid id)
    {
        return await _set.FindAsync(id);
    }

    public async Task<IEnumerable<TEntity>> GetAsync(Expression<Func<TEntity, bool>> filter = null, string includeProperties = "")
    {
        IQueryable<TEntity> query = _set;

        if (filter != null)
            query = query.Where(filter);

        foreach (var includeProperty in includeProperties.Split(',', StringSplitOptions.RemoveEmptyEntries))
            query = query.Include(includeProperty);

        return await query.ToListAsync();
    }

    public async Task AddAsync(TEntity entity)
    {
        await _set.AddAsync(entity);
    }

    public void Delete(TEntity entity)
    {
        _set.Remove(entity);
    }

    public void Update(TEntity entity)
    {
        _set.Update(entity);
    }

    public async Task LoadReferenceAsync<TProperty>(TEntity entity, Expression<Func<TEntity, TProperty>> propertyExpression) where TProperty : class
    {
        var entityEntry = _context.Entry(entity);
        if (entityEntry.State == EntityState.Detached)
            entityEntry.State = EntityState.Unchanged;
        await entityEntry.Reference(propertyExpression).LoadAsync();
    }

    public async Task LoadCollectionAsync<TProperty>(TEntity entity, Expression<Func<TEntity, IEnumerable<TProperty>>> propertyExpression) where TProperty : class
    {
        var entityEntry = _context.Entry(entity);
        if (entityEntry.State == EntityState.Detached)
            entityEntry.State = EntityState.Unchanged;
        await entityEntry.Collection(propertyExpression).LoadAsync();
    }
}