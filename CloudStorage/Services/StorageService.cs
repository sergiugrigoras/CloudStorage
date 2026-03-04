using System.Globalization;
using CloudStorage.Models;
using CloudStorage.Repositories.StorageNodes;
using CloudStorage.ViewModels;
using Microsoft.EntityFrameworkCore;
using MongoDB.Driver;

namespace CloudStorage.Services;

public interface IStorageService
{
    Task<StorageInfo> GetUsedStorage();
}

public class StorageService(ICurrentUser currentUser, AppDbContext context, IConfiguration configuration, IStorageNodeRepository storageNodeRepository): IStorageService
{
    private readonly ICurrentUser _currentUser =  currentUser ?? throw new ArgumentNullException(nameof(currentUser));
    private readonly IStorageNodeRepository _nodeRepository = storageNodeRepository ?? throw new ArgumentNullException(nameof(storageNodeRepository));
    private readonly string _storageSize = configuration.GetValue<string>("Storage:Size");
    private const long DefaultStorageSize = 100L * 1024 * 1024; // 100MB
    public async Task<StorageInfo> GetUsedStorage()
    {
        var mediaSize = await context.MediaObjects
            .Where(x => x.OwnerId == _currentUser.UserId && x.FileSize != null)
            .SumAsync(x => (long?)x.FileSize.Value) ?? 0L;
        
        var driveSize = await _nodeRepository.GetFilesSizeAsync(Builders<StorageNode>.Filter.Eq(x => x.IsFolder, false), _currentUser.UserId) ?? 0L;
        
        var storageSize = ParseStorageSize(_storageSize) ?? DefaultStorageSize;
        return new StorageInfo(mediaSize, driveSize, storageSize);
    }
    
    private static long? ParseStorageSize(string size)
    {
        if (string.IsNullOrWhiteSpace(size))
            return null;

        size = size.Trim().ToUpperInvariant();
        var end = size[^1];

        var multiplier = end switch
        {
            'K' => 1024L,
            'M' => 1024L * 1024,
            'G' => 1024L * 1024 * 1024,
            'T' => 1024L * 1024 * 1024 * 1024,
            _ => 1
        };

        if (multiplier == 1 && double.TryParse(size, NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture,
                out var valueNoMultiplier))
            return (long)valueNoMultiplier;
        
        if (multiplier > 1 && double.TryParse(size[..^1].Trim(), NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture,
                out var valueWithMultiplier))
            return (long)(valueWithMultiplier * multiplier);
            
        return null;
    }
}