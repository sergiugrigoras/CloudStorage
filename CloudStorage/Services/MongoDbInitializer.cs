using CloudStorage.Models;
using CloudStorage.Models.Expense;
using MongoDB.Driver;

namespace CloudStorage.Services;

public sealed class MongoDbInitializer(IMongoDatabase db) : IHostedService
{
    public async Task StartAsync(CancellationToken ct)
    {
        await InitializeUserCollectionAsync(ct);
        await InitializeInviteCollectionAsync(ct);
        await InitializeExpenseCategoriesCollectionAsync(ct);
        await InitializeStorageNodesCollectionAsync(ct);
    }

    private async Task InitializeUserCollectionAsync(CancellationToken ct)
    {
        var collection = db.GetCollection<User>(MongoDbCollections.Users);

        var caseInsensitive = new Collation("en", strength: CollationStrength.Secondary);

        var emailIndex = new CreateIndexModel<User>(
            Builders<User>.IndexKeys.Ascending(x => x.Email),
            new CreateIndexOptions { Unique = true, Collation = caseInsensitive });
        
        await collection.Indexes.CreateOneAsync(emailIndex, cancellationToken: ct);
    }
    
    private async Task InitializeInviteCollectionAsync(CancellationToken ct)
    {
        var collection = db.GetCollection<Invite>(MongoDbCollections.InviteCodes);

        var caseInsensitive = new Collation("en", strength: CollationStrength.Secondary);

        var emailIndex = new CreateIndexModel<Invite>(
            Builders<Invite>.IndexKeys.Ascending(x => x.Email),
            new CreateIndexOptions { Unique = true, Collation = caseInsensitive });
        
        await collection.Indexes.CreateOneAsync(emailIndex, cancellationToken: ct);
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    private async Task InitializeExpenseCategoriesCollectionAsync(CancellationToken ct)
    {
        try
        {
            var collection = db.GetCollection<Category>(MongoDbCollections.ExpenseCategories);
            
            var indexKeysDefinition = Builders<Category>.IndexKeys
                .Ascending(x => x.Name)
                .Ascending(x => x.UserId);
            var indexModel = new CreateIndexModel<Category>(indexKeysDefinition, new CreateIndexOptions { Unique = true });
            await collection.Indexes.CreateOneAsync(indexModel, cancellationToken: ct);
            
            Category[] defaultCategories = [
                new Category { Name = "Housing", Emoji = "🏠", UserId = null },
                new Category { Name = "Utilities", Emoji = "💡", UserId = null },
                new Category { Name = "Food & Dining", Emoji = "🍽️", UserId = null },
                new Category { Name = "Transportation", Emoji = "🚗", UserId = null },
                new Category { Name = "Health & Fitness", Emoji = "🏋️‍♂️", UserId = null },
                new Category { Name = "Entertainment & Recreation", Emoji = "🎮", UserId = null },
                new Category { Name = "Personal Care", Emoji = "💇‍♂️", UserId = null },
                new Category { Name = "Education", Emoji = "🎓", UserId = null },
                new Category { Name = "Insurance", Emoji = "🛡️", UserId = null },
                new Category { Name = "Debt Payments", Emoji = "💳", UserId = null },
                new Category { Name = "Savings & Investments", Emoji = "💰", UserId = null },
                new Category { Name = "Gifts & Donations", Emoji = "🎁", UserId = null },
                new Category { Name = "Travel", Emoji = "✈️", UserId = null },
                new Category { Name = "Miscellaneous", Emoji = "📦", UserId = null }
            ];
            
            await collection.InsertManyAsync(defaultCategories, cancellationToken: ct);
            
        }
        catch (Exception e)
        {
            Console.WriteLine(e);
        }
    }

    private async Task InitializeStorageNodesCollectionAsync(CancellationToken ct)
    {
        var collection = db.GetCollection<StorageNode>(MongoDbCollections.StorageNodes);
        
        var indexKeysDefinition = Builders<StorageNode>.IndexKeys
            .Ascending(x => x.OwnerId)
            .Ascending(x => x.ParentId)
            .Ascending(x => x.Name)
            .Ascending(x => x.Extension)
            .Ascending(x => x.IsFolder);
        var indexModel = new CreateIndexModel<StorageNode>(indexKeysDefinition, new CreateIndexOptions { Unique = true });
        await collection.Indexes.CreateOneAsync(indexModel, cancellationToken: ct);
    }
}


public static class MongoDbCollections
{
    public const string ExpenseEntries =  "expense_entries";
    public const string ExpenseCategories =  "expense_categories";
    public const string ExpensePaymentMethods =  "expense_payment_methods";
    public const string Notes =  "notes";
    public const string StorageNodes =  "storage_nodes";
    public const string MediaEntries =  "media_entries";
    public const string MediaAlbums =  "media_albums";
    public const string Users =  "app_users";
    public const string InviteCodes =  "invite_codes";
}