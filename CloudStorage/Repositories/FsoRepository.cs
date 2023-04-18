using CloudStorage.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace CloudStorage.Repositories
{
    public interface IFsoRepository
    {
        Task<FileSystemObject> GetUserRoot(Guid userId);
        Task<FileSystemObject> GetFolderContent(int id, Guid userId);
    }
    public class FsoRepository: IFsoRepository
    {
        private readonly AppDbContext _context;
        private readonly string _storageUrl;
        public FsoRepository(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _storageUrl = configuration.GetValue<string>("Storage:url");
        }

        public async Task<FileSystemObject> GetFolderContent(int id, Guid userId)
        {
            var folder = await _context.FileSystemObjects.FirstOrDefaultAsync(x => x.Id == id);
            if (folder == null) ThrowException(404, "Folder Not Found");
            if (folder.OwnerId != userId) ThrowException(403, "Forbidden");

            _context.Entry(folder).Collection(x => x.Children).Load();
            return folder;
        }

        public async Task<FileSystemObject> GetUserRoot(Guid userId)
        {
            var rootFolder = await _context.FileSystemObjects.FirstOrDefaultAsync(x => x.OwnerId == userId && x.ParentId == null && x.IsFolder);
            _context.Entry(rootFolder).Collection(x => x.Children).Load();
            return rootFolder;
        }

        private void ThrowException(int statusCode, string statusMessage)
        {
            var ex = new Exception(string.Format("{0} - {1}", statusMessage, statusCode.ToString()));
            ex.Data.Add(statusCode.ToString(), statusMessage);
            throw ex;
        }
    }
}
