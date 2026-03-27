using System.Security.Cryptography;
using System.Text;
using CloudStorage.Models;
using FFMpegCore;

namespace CloudStorage.Services;

public static class MediaHelper
{
    public static async Task CreateSnapshotAsync(string fromMediaFile, string toSnapshotFile, SemaphoreSlim semaphore, IMediaAnalysis mediaAnalysis = null)
    {
        try
        {
            if (!File.Exists(fromMediaFile)) return;
            await semaphore.WaitAsync();
            mediaAnalysis ??= await FFProbe.AnalyseAsync(fromMediaFile);
            await FFMpegArguments
                .FromFileInput(fromMediaFile)
                .OutputToFile(toSnapshotFile, true, options => options
                    .Seek(TimeSpan.FromSeconds(mediaAnalysis.Duration.TotalSeconds / 4))
                    .WithVideoFilters(filterOptions => filterOptions
                        .Scale(300, -1))
                    .WithFrameOutputCount(1)
                    .WithCustomArgument("-q:v 2")
                ).ProcessAsynchronously(false);
        }
        catch (Exception e)
        {
            Console.WriteLine(e.Message);
        }
        finally
        {
            semaphore.Release();
        }
    }
    
    public static async Task<string> ComputeMd5Async(string filename)
    {
        if (!File.Exists(filename)) return null;

        using var md5 = MD5.Create();
        await using var stream = new FileStream(filename, FileMode.Open, FileAccess.Read, FileShare.Read);
        var hash = await md5.ComputeHashAsync(stream);
        return BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();
    }
    
    public static async Task<string> ComputeSha256Async(string filePath)
    {
        using var sha256 = SHA256.Create();
        await using var stream = File.OpenRead(filePath);
        var hashBytes = await sha256.ComputeHashAsync(stream);
        return BytesToHexString(hashBytes);
    }
    
    public static async Task<string> ComputeSha256Async(IFormFile file)
    {
        using var sha256 = SHA256.Create();
        await using var stream = file.OpenReadStream();
        var hashBytes = await sha256.ComputeHashAsync(stream);
        return BytesToHexString(hashBytes);
    }

    private static string BytesToHexString(byte[] bytes)
    {
        var sb = new StringBuilder(bytes.Length * 2);
        foreach (var b in bytes)
            sb.Append(b.ToString("x2"));

        return sb.ToString();
    }

    public static void DeleteFile(string fileName)
    {
        try
        {
            File.Delete(fileName);
        }
        catch (Exception e)
        {
            Console.WriteLine(e.Message);
        }
    }
    
    public static void CreateDirectoryIfNotExists(string path)
    {
        if (string.IsNullOrWhiteSpace(path) || Directory.Exists(path)) return;
        Directory.CreateDirectory(path);
    }
}

public class Base64Image
{
    public string ContentType { get; set; }
    public byte[] FileContents { get; set; }

    public static Base64Image Parse(string base64Content)
    {
        if (string.IsNullOrEmpty(base64Content))
        {
            throw new ArgumentNullException(nameof(base64Content));
        }

        var indexOfSemiColon = base64Content.IndexOf(";", StringComparison.OrdinalIgnoreCase);

        var dataLabel = base64Content.Substring(0, indexOfSemiColon);

        var contentType = dataLabel.Split(':').Last();

        var startIndex = base64Content.IndexOf("base64,", StringComparison.OrdinalIgnoreCase) + 7;

        var fileContents = base64Content.Substring(startIndex);

        var bytes = Convert.FromBase64String(fileContents);

        return new Base64Image
        {
            ContentType = contentType,
            FileContents = bytes
        };
    }

    public override string ToString()
    {
        return $"data:{ContentType};base64,{Convert.ToBase64String(FileContents)}";
    }
}