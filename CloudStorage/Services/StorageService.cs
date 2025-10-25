using System.Globalization;
using CloudStorage.Models;
using CloudStorage.ViewModels;
using Microsoft.EntityFrameworkCore;

namespace CloudStorage.Services;

public interface IStorageService
{
    Task<StorageInfo> GetUsedStorageByUser(Guid userId);
}

public class StorageService(AppDbContext context, IConfiguration configuration): IStorageService
{
    private readonly string _storageSize = configuration.GetValue<string>("Storage:Size");
    private const long DefaultStorageSize = 100L * 1024 * 1024; // 100MB
    public async Task<StorageInfo> GetUsedStorageByUser(Guid userId)
    {
        var mediaSize = await context.MediaObjects
            .Where(x => x.OwnerId == userId && x.FileSize != null)
            .SumAsync(x => (long?)x.FileSize.Value) ?? 0L;
        
        var driveSize = await context.FileSystemObjects
            .Where(x => x.OwnerId == userId && !x.IsFolder && x.FileSize != null)
            .SumAsync(x => (long?)x.FileSize.Value) ?? 0L;
        
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