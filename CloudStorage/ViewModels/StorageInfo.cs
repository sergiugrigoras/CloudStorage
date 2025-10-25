namespace CloudStorage.ViewModels;

public class StorageInfo(long mediaFileSize, long driveFilesSize, long storageSize)
{
    public long MediaFilesSize { get; } = mediaFileSize;
    public long DriveFilesSize { get; } = driveFilesSize;
    public long TotalUsed => DriveFilesSize + MediaFilesSize;
    public long StorageSize { get; } = storageSize;
    public int PercentageUsed => StorageSize == 0 ? 0 : (int)Math.Round(TotalUsed * 100.0 / StorageSize);
    
    public bool HasSpace(long size) => TotalUsed + size <= StorageSize;
}