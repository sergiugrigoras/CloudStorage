using System.Text;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace CloudStorage.Models;

public class StorageNode
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; }

    [BsonRepresentation(BsonType.ObjectId)]
    public List<string> Path { get; set; } = [];
    
    public string Name { get; set; }
    public string Extension { get; set; } 
    
    public bool IsFolder { get; set; }
    
    [BsonRepresentation(BsonType.ObjectId)]
    public string ParentId { get; set; }
    
    public string FileName { get; set; }

    public long? FileSize { get; set; }

    public DateTime? Date { get; set; }

    [BsonRepresentation(BsonType.ObjectId)]
    public string OwnerId { get; set; }
    
    [BsonIgnore]
    public string FullName => IsFolder ? Name : Name + (Extension ?? string.Empty);
}

public class StorageNodeInputModel
{
    public string Id { get; set; }
    public string Name { get; set; }
    public bool IsFolder { get; set; }
    public string ParentId { get; set; }
    
    public StorageNode ToDomain()
    {
        var nameAndExtension = IsFolder
            ? new NameAndExtension(Name?.Trim(), null)
            : SplitNameAndExtension(Name);
        
        return new StorageNode
        {
            Id = Id,
            Name = FileNameSanitizer.Sanitize(nameAndExtension.Name),
            Extension = nameAndExtension.Extension,
            IsFolder = IsFolder,
            ParentId = ParentId,
        };
    }

    private static NameAndExtension SplitNameAndExtension(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            return new NameAndExtension(string.Empty, null);
        
        var trimmed = name.Trim();
        var ext = Path.GetExtension(trimmed);
        
        if (string.IsNullOrEmpty(ext) || ext == ".")
            ext = null;
        else
            ext = ext.Trim().ToLower();
        
        var baseName = ext == null
            ? trimmed
            : Path.GetFileNameWithoutExtension(trimmed).Trim();

        if (string.IsNullOrEmpty(baseName) && !string.IsNullOrEmpty(ext))
        {
            baseName = ext;
            ext = null;
        }
        return new NameAndExtension(baseName, ext);
    }
}

public sealed class NameAndExtension(string name, string extension)
{
    public string Name { get; } = name;
    public string Extension { get; } = extension;
}

public static class FileNameSanitizer
{
    private static readonly HashSet<char> ForbiddenChars = ['<', '>', ':', '"', '/', '\\', '|', '?', '*'];

    static FileNameSanitizer()
    {
        for (var i = 0; i <= 31; i++)
            ForbiddenChars.Add((char)i);
        ForbiddenChars.Add((char)127);
    }

    public static string Sanitize(string name, char replacement = '_') =>
        string.IsNullOrEmpty(name)
            ? string.Empty
            : SanitizeInternal(name, replacement);

    private static string SanitizeInternal(string name, char replacement)
    {
        var sb = new StringBuilder(name.Length);
        foreach (var c in name)
            sb.Append(ForbiddenChars.Contains(c) ? replacement : c);
        return sb.ToString();
    }
}



public class StorageNodeViewModel
{
    public string Id { get; set; }
    public string Name { get; set; }
    public string Extension { get; set; } 
    public bool IsFolder { get; set; }
    public string ParentId { get; set; }
    public long? FileSize { get; set; }
    public DateTime? Date { get; set; }
    
    public static StorageNodeViewModel FromDomain(StorageNode node)
    {
        if (node == null) return null;
        
        return new StorageNodeViewModel
        {
            Id = node.Id,
            Name = node.Name,
            Extension = node.Extension,
            IsFolder = node.IsFolder,
            ParentId = node.ParentId,
            FileSize = node.FileSize,
            Date = node.Date
        };
    }
}

public class FileUploadModel 
{
    public List<IFormFile> Files { get; set; }
    public string NodeId { get; set; }
}

public class CollectionOfNodes
{
    public List<string> NodeIds { get; set; }
    public string DestinationNodeId  { get; set; }
}

public class NodeDownloadStream(Stream stream, string contentType)
{
    public Stream Stream { get; init; } = stream;
    public string ContentType { get; init; } = contentType;
}