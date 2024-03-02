using System.Globalization;

namespace CloudStorage.ViewModels;

public class DiskInfo(long total, long used)
{
    public long Total { get; } = total;
    public long Used { get; } = used;
    public string UsedPercentage => Math.Round(Used * 100.0 / Total).ToString(CultureInfo.InvariantCulture);
}