using CloudStorage.Models;
using Microsoft.EntityFrameworkCore;
using System.IO.Compression;


namespace CloudStorage.Services
{
    public interface IFsoService
    {
        Task<FileSystemObject> GetByIdAsync(int id);
        Task<FileSystemObject> FindAsync(string name, int parentId);
        Task<IEnumerable<FileSystemObject>> GetFullPathAsync(FileSystemObject fso);
        Task RenameAsync(FileSystemObject fso, string newName);
        Task DeleteAsync(FileSystemObject fso);
        Task<FileSystemObject> CreateAsync(FileSystemObject model);
        Task<string> StoreFileAsync(IFormFile file, Guid userId);
        Task<Stream> GetFileAsync(FileSystemObject root, ICollection<FileSystemObject> fsoList);
        Task MoveFsoAsync(FileSystemObject fso, FileSystemObject destination);
        Task<FileSystemObject> GetUserRootAsync(Guid userId);
        Task LoadFolderContentAsync(FileSystemObject fso);
        Task<bool> UniqueName(string name, int parentId, bool isFolder);
        Task<string> GetDistinctNameAsync(string name, int parentId, bool isFolder, uint counter = 0);
    }
    public class FsoService(AppDbContext context, IConfiguration configuration) : IFsoService
    {
        private const string DriveDirName = "drive";
        private readonly string _storageUrl = configuration.GetValue<string>("Storage:Url");
        
        public async Task<FileSystemObject> CreateAsync(FileSystemObject model)
        {
            context.FileSystemObjects.Add(model);
            await context.SaveChangesAsync();
            return model;
        }

        public async Task DeleteAsync(FileSystemObject fso)
        {
            if (fso.IsFolder)
            {
                var children = await GetFsoContentAsync(fso);
                foreach (var child in children)
                    await DeleteAsync(child);

                context.FileSystemObjects.Remove(fso);
                await context.SaveChangesAsync();
            }
            else
            {
                context.FileSystemObjects.Remove(fso);
                await context.SaveChangesAsync();
                DeleteFile(fso);
            }
        }

        public async Task<FileSystemObject> GetByIdAsync(int id)
        {
            return await context.FileSystemObjects.FindAsync(id);
        }

        public async Task<FileSystemObject> FindAsync(string name, int parentId)
        {
            return await context.FileSystemObjects.FirstOrDefaultAsync(x => x.ParentId == parentId && x.Name == name);
        }

        public async Task<IEnumerable<FileSystemObject>> GetFullPathAsync(FileSystemObject fso)
        {
            var parser = fso;
            var result = new List<FileSystemObject>();
            while (parser != null)
            {
                result.Insert(0, parser);
                parser = await context.FileSystemObjects
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x => x.Id == parser.ParentId);
            }
            return result;
        }
        
        public async Task RenameAsync(FileSystemObject fso, string newName)
        {
            if (fso == null || fso.Name.Equals(newName)) return;
            if (fso.Name == newName) return;
            var exists = await context.FileSystemObjects
                .FirstOrDefaultAsync(x =>
                    x.ParentId == fso.ParentId && x.IsFolder == fso.IsFolder && x.Name == newName);
            if (exists == null)
            {
                fso.Name = newName;
                context.FileSystemObjects.Update(fso);
                await context.SaveChangesAsync();
            }
            else
            {
                throw new Exception("Name is not unique.");
            }
        }

        public async Task<string> StoreFileAsync(IFormFile file, Guid userId)
        {
            var userDirectory = GetStorageLocation(userId);
            if (string.IsNullOrEmpty(userDirectory)) return null;
            if (!Directory.Exists(userDirectory))
                Directory.CreateDirectory(userDirectory);
            
            var fileName = Guid.NewGuid().ToString();
            var filePath = Path.Combine(userDirectory, fileName);
            await using var stream = File.Create(filePath);
            await file.CopyToAsync(stream);

            return fileName;
        }

        public async Task<Stream> GetFileAsync(FileSystemObject root, ICollection<FileSystemObject> fsoList)
        {
            var ms = new MemoryStream();

            var first = fsoList.First();
            if (fsoList.Count == 1 && !first.IsFolder)
            {
                var fileFullPath = Path.Combine(GetStorageLocation(root.OwnerId), fsoList.First().FileName);
                await using var stream = new FileStream(fileFullPath, FileMode.Open);
                await stream.CopyToAsync(ms);
            }
            else
            {
                var archive = new ZipArchive(ms, ZipArchiveMode.Create, true);
                foreach (var fso in fsoList)
                    await AddFsoToArchiveAsync(archive, fso, root);
                archive.Dispose();
            }
            ms.Seek(0, SeekOrigin.Begin);
            return ms;
        }

        private async Task<IEnumerable<FileSystemObject>> GetFsoContentAsync(FileSystemObject fso)
        {
            return await context.FileSystemObjects
                .AsNoTracking()
                .Where(f => f.ParentId == fso.Id).ToArrayAsync();
        }
        
        private async Task AddFsoToArchiveAsync(ZipArchive archive, FileSystemObject fso, FileSystemObject root)
        {
            var fsoPath = string.Empty;
            var parser = await GetByIdAsync(fso.ParentId.GetValueOrDefault());
            while (parser.Id != root.Id)
            {
                fsoPath = fsoPath.Insert(0, parser.Name + "/");
                parser = await GetByIdAsync(parser.ParentId.GetValueOrDefault());
            }

            if (!fso.IsFolder)
            {
                var fullPath = Path.Combine(GetStorageLocation(fso.OwnerId), fso.FileName);
                archive.CreateEntryFromFile(fullPath, fsoPath + fso.Name, CompressionLevel.Optimal);
            }
            else
            {
                archive.CreateEntry(fsoPath + fso.Name + "/");
                foreach (var c in await GetFsoContentAsync(fso))
                {
                    await AddFsoToArchiveAsync(archive, c, root);
                }
            }
        }

        public async Task<bool> UniqueName(string name, int parentId, bool isFolder)
        {
            var exists = await context.FileSystemObjects
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.ParentId == parentId && x.Name == name && x.IsFolder == isFolder);
            return exists == null;
        }

        public async Task<string> GetDistinctNameAsync(string name, int parentId, bool isFolder, uint counter = 0)
        {
            var suggestedName = counter == 0
                ? name
                : $"{Path.GetFileNameWithoutExtension(name)}({counter}){Path.GetExtension(name)}";
            var exists = await context.FileSystemObjects
                .FirstOrDefaultAsync(x => x.IsFolder == isFolder && x.ParentId == parentId && x.Name == suggestedName);
            if (exists == null) return suggestedName;
            
            return await GetDistinctNameAsync(name, parentId, isFolder, ++counter);
        }

        private void DeleteFile(FileSystemObject fso)
        {
            var file = Path.Combine(GetStorageLocation(fso.OwnerId), fso.FileName);
            if (!File.Exists(file)) return;
            try
            {
                File.Delete(file);
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.Message);
            }
        }
        
        public static string GetMimeType(string extension)
        {
            if (string.IsNullOrWhiteSpace(extension)) return "application/octet-stream";
            if (!extension.StartsWith('.'))
                extension = "." + extension;
            return MimeTypes.GetType(extension);
        }
        
        public async Task MoveFsoAsync(FileSystemObject fso, FileSystemObject destination)
        {
            if (fso == null || destination == null || fso.ParentId == destination.Id)
                throw new FsoException("Bad move request.");

            if (fso.IsFolder)
            {
                var destinationFullPath = await GetFullPathAsync(destination);
                if (destinationFullPath.Select(x => x.Id).Contains(fso.Id))
                    throw new FsoException("Destination is a subfolder of source");
            }
            
            var distinctName = await GetDistinctNameAsync(fso.Name, destination.Id, fso.IsFolder);
            fso.Name = distinctName;
            fso.ParentId = destination.Id;
            context.FileSystemObjects.Update(fso);
            await context.SaveChangesAsync();
        }

        public async Task LoadFolderContentAsync(FileSystemObject fso)
        {
            if (fso == null) return;
            await context.Entry(fso).Collection(x => x.Children).LoadAsync();
        }

        public async Task<FileSystemObject> GetUserRootAsync(Guid userId)
        {
            return await context.FileSystemObjects.FirstOrDefaultAsync(x => x.OwnerId == userId && x.ParentId == null && x.IsFolder);
        }
        
        private string GetStorageLocation(Guid userId) => Path.Combine(_storageUrl, userId.ToString(), DriveDirName);
    }


}
