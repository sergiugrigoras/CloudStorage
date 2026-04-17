using System.Globalization;
using CloudStorage.Extensions;
using CloudStorage.Repositories.Media;
using CloudStorage.Repositories.StorageNodes;
using CloudStorage.ViewModels;

namespace CloudStorage.Services;

public interface IStorageService
{
    Task<StorageInfo> GetUsedStorage(string userId = null);
}

public class StorageService(ICurrentUser currentUser, IConfiguration configuration, IStorageNodeRepository storageNodeRepository, IMediaEntryRepository mediaEntryRepository): IStorageService
{
    private readonly ICurrentUser _currentUser =  currentUser ?? throw new ArgumentNullException(nameof(currentUser));
    private readonly IStorageNodeRepository _nodeRepository = storageNodeRepository ?? throw new ArgumentNullException(nameof(storageNodeRepository));
    private readonly IMediaEntryRepository _mediaEntryRepository = mediaEntryRepository ?? throw new ArgumentNullException(nameof(mediaEntryRepository));
    private readonly IConfiguration _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
    
    private const long DefaultStorageSize = 100L * 1024 * 1024; // 100MB
    public async Task<StorageInfo> GetUsedStorage(string userId = null)
    {
        var driveSize = await _nodeRepository.GetFilesSizeAsync(userId ?? _currentUser.UserId) ?? 0L;
        var mediaSize = await _mediaEntryRepository.GetFilesSizeAsync(userId ?? _currentUser.UserId) ?? 0L;
        var storageSize = ParseStorageSize(_configuration.StorageSize()) ?? DefaultStorageSize;
        
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