using System.Linq.Expressions;
using CloudStorage.Interfaces;
using CloudStorage.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Metadata;

namespace CloudStorage.Repositories;

public abstract class Repository<TEntity>(AppDbContext context) : IRepository<TEntity>
    where TEntity : class
{
    protected AppDbContext Context { get; } = context;
    private DbSet<TEntity> Set { get; } = context.Set<TEntity>();
    
    public async Task<TEntity> GetAsync(Guid id)
    {
        return await Set.FindAsync(id);
    }

    public IQueryable<TEntity> Query(Expression<Func<TEntity, bool>> filter = null, string includeProperties = "")
    {
        IQueryable<TEntity> query = Set;

        if (filter != null)
            query = query.Where(filter);

        foreach (var includeProperty in includeProperties.Split(',', StringSplitOptions.RemoveEmptyEntries))
            query = query.Include(includeProperty);

        return query;
    }

    public async Task AddAsync(TEntity entity)
    {
        await Set.AddAsync(entity);
    }

    public void Delete(TEntity entity)
    {
        Set.Remove(entity);
    }

    public void DeleteMany(IEnumerable<TEntity> entities)
    {
        Set.RemoveRange(entities);
    }

    public void Update(TEntity entity)
    {
        Set.Update(entity);
    }

    public async Task LoadReferenceAsync<TProperty>(TEntity entity, Expression<Func<TEntity, TProperty>> propertyExpression) where TProperty : class
    {
        var entityEntry = Context.Entry(entity);
        if (entityEntry.State == EntityState.Detached)
            entityEntry.State = EntityState.Unchanged;
        await entityEntry.Reference(propertyExpression).LoadAsync();
    }

    public async Task LoadCollectionAsync<TProperty>(TEntity entity, Expression<Func<TEntity, IEnumerable<TProperty>>> propertyExpression) where TProperty : class
    {
        var entityEntry = Context.Entry(entity);
        if (entityEntry.State == EntityState.Detached)
            entityEntry.State = EntityState.Unchanged;
        await entityEntry.Collection(propertyExpression).LoadAsync();
    }
}