using CloudStorage.Models;

namespace CloudStorage.ViewModels;

public class FileSystemObjectViewModel
{
    public FileSystemObjectViewModel()
    {
    }
    public FileSystemObjectViewModel(FileSystemObject fso)
    {
        Id = fso.Id;
        Name = fso.Name;
        ParentId = fso.ParentId;
        IsFolder = fso.IsFolder;
        FileName = fso.FileName;
        FileSize = fso.FileSize;
        Date = fso.Date;
        OwnerId = fso.OwnerId;
        Children = fso.Children.Select(x => new FileSystemObjectViewModel(x)).ToList();
    }

    public int Id { get; set; }
    public string Name { get; set; }
    public int? ParentId { get; set; }
    public bool IsFolder { get; set; }
    public string FileName { get; set; }
    public long? FileSize { get; set; }
    public DateTime Date { get; set; }
    public Guid OwnerId { get; set; }
    public ICollection<FileSystemObjectViewModel> Children { get; set; }
}