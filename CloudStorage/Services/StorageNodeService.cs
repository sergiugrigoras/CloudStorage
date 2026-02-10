using CloudStorage.Models;
using System.IO.Compression;
using System.Net.Http.Headers;
using System.Text.RegularExpressions;
using CloudStorage.Repositories.StorageNodes;
using MongoDB.Bson;
using MongoDB.Driver;

namespace CloudStorage.Services
{
    public interface IStorageNodeService
    {
        Task<StorageNode> RenameAsync(StorageNode node);
        Task DeleteAsync(List<string> nodeIds, Guid userId);
        Task<StorageNode> CreateAsync(StorageNode node);
        Task<StorageNode> StoreFileAsync(IFormFile file, Guid userId, string parentId, DateTime date);
        Task<NodeDownloadStream> DownloadNodesAsync(List<string> nodeIds,  Guid userId);
        Task<List<StorageNode>> MoveNodesAsync(List<string> rootIds, string destinationNodeId, Guid userId);
        Task<List<StorageNode>> GetUserNodesAsync(Guid userId);
    }
    public class StorageNodeService(IConfiguration configuration, IStorageNodesRepository nodesRepository) : IStorageNodeService
    {
        private const string DriveDirName = "drive";
        private readonly string _storageUrl = configuration.GetValue<string>("Storage:Url");
        private readonly IStorageNodesRepository _nodesRepository = nodesRepository ?? throw new ArgumentNullException(nameof(nodesRepository));

        private static Regex BuildNameWithNumericSuffixRegex(string name) =>
            new Regex($@"^{Regex.Escape(name ?? string.Empty)}\(([1-9]\d*)\)$");
        public async Task<StorageNode> CreateAsync(StorageNode node)
        {
            ArgumentNullException.ThrowIfNull(node);
            
            var parentNode = await CheckParentNodeAsync(node);
            if (parentNode != null)
                node.Path = [..parentNode.Path, parentNode.Id];
            
            var nodeExists = await _nodesRepository.GetManyAsync(BuildNameCollisionFilter(node));
            var existingNames = nodeExists.Select(x => x.Name).ToList();
            node.Name = GenerateUniqueName(node.Name, existingNames);;
            await _nodesRepository.CreateNodeAsync(node);
            return node;
        }

        private async Task<StorageNode> CheckParentNodeAsync(StorageNode node)
        {
            if (node.ParentId == null) return null;
            var parentNode = await _nodesRepository
                .GetOneAsync(x => x.Id == node.ParentId && x.OwnerId == node.OwnerId);
            return parentNode ?? throw new InvalidOperationException("Parent node not found");
        }

        private static string GenerateUniqueName(string baseName, List<string> existingNames)
        {
            if (!existingNames.Contains(baseName)) return baseName;
            var nameRegex = BuildNameWithNumericSuffixRegex(baseName);
            var numberedFiles = existingNames
                .Select(n => nameRegex.Match(n))
                .Where(m => m.Success)
                .Select(m => int.TryParse(m.Groups[1].Value, out var result) ? result : 0)
                .Where(x => x > 0)
                .ToList();
            
            var nextNumber = numberedFiles.Count == 0 ? 1 : numberedFiles.Max() + 1;
            return $"{baseName}({nextNumber})";
        }

        public async Task DeleteAsync(List<string> nodeIds, Guid userId)
        {
            if (nodeIds == null || nodeIds.Count == 0) return;
            
            var ids = nodeIds.ToHashSet();
            var nodesToDelete = await _nodesRepository
                .GetManyAsync(x =>
                    x.OwnerId == userId &&
                    (ids.Contains(x.Id) || x.Path.Any(p => ids.Contains(p)))
                );

            var storageLocation = GetStorageLocation(userId);
            foreach (var node in nodesToDelete.ToArray())
            {
                if (node.IsFolder || node.FileName == null) continue;
                    
                var filePath = Path.Combine(storageLocation, node.FileName);
                try
                {
                    if (File.Exists(filePath))
                        File.Delete(filePath);
                }
                catch (Exception e)
                {
                    Console.WriteLine($"Failed to delete file '{filePath}': {e.Message}");
                    nodesToDelete.Remove(node);
                }
            }
            
            await _nodesRepository.DeleteNodesAsync(nodesToDelete.Select(x => x.Id));
        }
        
        public Task<StorageNode> GetNodeByIdAsync(string id) => _nodesRepository.GetByIdAsync(id);
        
        public async Task<StorageNode> RenameAsync(StorageNode node)
        {
            ArgumentNullException.ThrowIfNull(node);
            await CheckParentNodeAsync(node);
            
            if (string.IsNullOrWhiteSpace(node.Name))
                throw new InvalidOperationException("Name cannot be empty");
            
            if (await _nodesRepository.ExistsAsync(BuildUniqueNodeFilter(node)))
                throw new InvalidOperationException($"{node.Name} already exists");
            
            return await _nodesRepository.UpdateOneAsync(BuildNodeIdFilter(node.Id), UpdateNameDefinition(node.Name));
        }

        public async Task<StorageNode> StoreFileAsync(IFormFile file, Guid userId, string parentId, DateTime date)
        {
            var storageFileName = await SaveFileToStorageAsync(file, userId);
            if (storageFileName == null)
                throw new IOException("Unable to save file");
            
            var formFileName = Path.GetFileName(
                ContentDispositionHeaderValue.Parse(file.ContentDisposition).FileName?.Trim('"')
            );

            if (formFileName == null)
                throw new InvalidOperationException("Invalid file name");

            var node = StorageNodeInputModel.ToDomain(
                new StorageNodeInputModel { IsFolder = false, Name = formFileName, ParentId = parentId },
                userId,
                date
            );
            if (node == null)
                throw new InvalidOperationException("Unable to create node.");
            
            node.FileName = storageFileName;
            node.FileSize = file.Length;
            return await CreateAsync(node);
        }
        
        private static FilterDefinition<StorageNode> BuildNodeIdFilter(string id) => Builders<StorageNode>.Filter.Eq(x => x.Id, id);

        private static FilterDefinition<StorageNode> BuildUniqueNodeFilter(StorageNode node)
        {
            var nameFilter = Builders<StorageNode>.Filter.Eq(x => x.Name, node.Name);
            var parentFilter = Builders<StorageNode>.Filter.Eq(x => x.ParentId, node.ParentId);
            var ownerFilter =  Builders<StorageNode>.Filter.Eq(x => x.OwnerId, node.OwnerId);
            var folderFilter = Builders<StorageNode>.Filter.Eq(x => x.IsFolder, node.IsFolder);
            return Builders<StorageNode>.Filter.And(nameFilter, parentFilter, ownerFilter, folderFilter);
        }

        private static FilterDefinition<StorageNode> BuildNameCollisionFilter(StorageNode node)
        {
            return Builders<StorageNode>.Filter.And(
                    Builders<StorageNode>.Filter.Eq(x => x.OwnerId, node.OwnerId),
                    Builders<StorageNode>.Filter.Eq(x => x.ParentId, node.ParentId),
                    Builders<StorageNode>.Filter.Eq(x => x.IsFolder, node.IsFolder),
                    Builders<StorageNode>.Filter.Eq(x => x.Extension, node.Extension),
                    Builders<StorageNode>.Filter.Or(
                        Builders<StorageNode>.Filter.Eq(x => x.Name, node.Name),
                        Builders<StorageNode>.Filter.Regex(x => x.Name, new BsonRegularExpression(BuildNameWithNumericSuffixRegex(node.Name)))
                    )
                );
        }

        private static UpdateDefinition<StorageNode> UpdateNameDefinition(string name) =>
            Builders<StorageNode>.Update.Set(n => n.Name, name);

        private static UpdateDefinition<StorageNode> UpdatePathDefinition(List<string> path) =>
            Builders<StorageNode>.Update.Set(n => n.Path, path);
        
        private static UpdateDefinition<StorageNode> UpdateParentDefinition(string parentId) =>
            Builders<StorageNode>.Update.Set(n => n.ParentId, parentId);
        
        private async Task<string> SaveFileToStorageAsync(IFormFile file, Guid userId)
        {
            try
            {
                var userDirectory = GetStorageLocation(userId);
                if (string.IsNullOrEmpty(userDirectory)) return null;
                if (!Directory.Exists(userDirectory))
                    Directory.CreateDirectory(userDirectory);
            
                var fileName = Guid.NewGuid().ToString("N");
                var filePath = Path.GetFullPath(Path.Combine(userDirectory, fileName));
                if (!filePath.StartsWith(userDirectory))
                    throw new UnauthorizedAccessException("Access to the requested file path is not allowed.");
                await using var stream = File.Create(filePath);
                await file.CopyToAsync(stream);

                return fileName;
            }
            catch (Exception)
            {
                return null;
            }

        }

        public async Task<NodeDownloadStream> DownloadNodesAsync(List<string> nodeIds,  Guid userId)
        {
            var nodesToDownloadFilter = Builders<StorageNode>.Filter.And(
                Builders<StorageNode>.Filter.Eq(x => x.OwnerId, userId),
                Builders<StorageNode>.Filter.Or(
                    Builders<StorageNode>.Filter.In(x => x.Id, nodeIds),
                    Builders<StorageNode>.Filter.AnyIn(x => x.Path, nodeIds)
                )
            );
            var nodesToDownload = await _nodesRepository
                .GetManyAsync(nodesToDownloadFilter)
                .ContinueWith(task =>
                    task.Result.GroupBy(x => x.Id)
                        .ToDictionary(x => x.Key, x => x.First())
                );
            if (nodesToDownload.Count == 0)
                throw new InvalidOperationException($"No nodes to download.");
            
            var ms = new MemoryStream();
            if (nodesToDownload.Count == 1 && !nodesToDownload.First().Value.IsFolder) 
            {
                var kvp = nodesToDownload.First();
                var filePath = Path.Combine(GetStorageLocation(userId), kvp.Value.FileName);
                var contentType = GetMimeType(kvp.Value.Extension);
                await using var stream = new FileStream(filePath, FileMode.Open);
                await stream.CopyToAsync(ms);
                
                ms.Seek(0, SeekOrigin.Begin);
                return new NodeDownloadStream(ms, contentType);
            }
            
            var archive = new ZipArchive(ms, ZipArchiveMode.Create, true);
            foreach (var id in nodeIds)
            {
                if (!nodesToDownload.TryGetValue(id, out var rootNode)) continue;
                AddNodeToArchive(rootNode, string.Empty);
            }
            archive.Dispose();
            ms.Seek(0, SeekOrigin.Begin);
            return new NodeDownloadStream(ms, GetMimeType(".zip"));

            void AddNodeToArchive(StorageNode node, string path)
            {
                var nodePath = string.IsNullOrEmpty(path)
                    ? node.FullName
                    : $"{path}/{node.FullName}";
                if (node.IsFolder)
                {
                    var children = nodesToDownload.Values.Where(x => x.ParentId == node.Id).ToList();

                    if (children.Count == 0)
                    {
                        archive.CreateEntry($"{nodePath}/");
                        return;
                    }

                    foreach (var child in children)
                    {
                        AddNodeToArchive(child, nodePath);
                    }
                }
                else
                {
                    var filePath = Path.Combine(GetStorageLocation(node.OwnerId), node.FileName);
                    archive.CreateEntryFromFile(filePath, nodePath, CompressionLevel.Optimal);
                }
            }
        }
        
        public async Task<List<StorageNode>> MoveNodesAsync(List<string> rootIds, string destinationNodeId, Guid userId)
        {
            if (rootIds == null || rootIds.Count == 0) return [];
            var destinationNode = await _nodesRepository.GetOneAsync(x => x.Id == destinationNodeId && x.OwnerId == userId);
            var destinationNodeChildren = await _nodesRepository.GetManyAsync(x => x.ParentId == destinationNodeId && x.OwnerId == userId);
            if (destinationNodeId != null && destinationNode == null)
                throw new InvalidOperationException($"Destination node {destinationNodeId} not found");
            
            var nodesToMoveFilter = Builders<StorageNode>.Filter.And(
                Builders<StorageNode>.Filter.Eq(x => x.OwnerId, userId),
                Builders<StorageNode>.Filter.Or(
                    Builders<StorageNode>.Filter.In(x => x.Id, rootIds),
                    Builders<StorageNode>.Filter.AnyIn(x => x.Path, rootIds)
                )
            );
            var nodesToMove = await _nodesRepository
                .GetManyAsync(nodesToMoveFilter)
                .ContinueWith(task =>
                    task.Result.GroupBy(x => x.Id)
                        .ToDictionary(x => x.Key, x => x.First())
                );
            
            var moveResult = new List<StorageNode>();
            var childrenMoveOperations = new List<WriteModel<StorageNode>>();
            foreach (var rootId in rootIds)
            {
                if (!nodesToMove.TryGetValue(rootId, out var rootNode))
                    continue;
                
                // Destination node is child of root node
                if (destinationNode != null && destinationNode.Path.Contains(rootNode.Id))
                    continue;
                
                var oldRootPrefixLength = rootNode.Path.Count;
                var newRootPrefix = destinationNode != null
                    ? destinationNode.Path.Append(destinationNode.Id).ToList()
                    : [];
                var updatedRootNode =
                    await MoveNodeAsync(rootNode, destinationNode?.Id, newRootPrefix, destinationNodeChildren);
                destinationNodeChildren.Add(updatedRootNode);
                moveResult.Add(updatedRootNode);
                
                foreach (var childNode in nodesToMove.Values.Where(x => x.Path.Contains(rootNode.Id)))
                {
                    childrenMoveOperations.Add(
                        new UpdateOneModel<StorageNode>(
                            BuildNodeIdFilter(childNode.Id),
                            UpdatePathDefinition(
                                newRootPrefix.Concat(childNode.Path.Skip(oldRootPrefixLength)).ToList())
                        )
                    );
                }
            }
            if (childrenMoveOperations.Count > 0)
                await _nodesRepository.BulkWriteAsync(childrenMoveOperations);
            
            return moveResult;
        }

        private Task<StorageNode> MoveNodeAsync(StorageNode node, string newParentId, List<string> newPath,
            IReadOnlyCollection<StorageNode> siblings)
        {
            var update = UpdatePathDefinition(newPath).Set(n => n.ParentId, newParentId);
            if (!siblings.Any(x => x.FullName == node.FullName && x.IsFolder == node.IsFolder))
                return _nodesRepository.UpdateOneAsync(BuildNodeIdFilter(node.Id), update);
            
            var existingNames = siblings
                .Where(x =>
                {
                    var nameMatch = x.Name == node.Name || BuildNameWithNumericSuffixRegex(node.Name).IsMatch(x.Name);
                    var extensionMatch = x.Extension == node.Extension;
                    var typeMatch = x.IsFolder == node.IsFolder;
                    return nameMatch && extensionMatch && typeMatch;
                })
                .Select(x => x.Name)
                .ToList();
            
            var uniqueName = GenerateUniqueName(node.Name, existingNames);
            update = update.Set(x => x.Name, uniqueName);

            return _nodesRepository.UpdateOneAsync(BuildNodeIdFilter(node.Id), update);
        }
        
        private static string GetMimeType(string extension)
        {
            if (string.IsNullOrWhiteSpace(extension)) return "application/octet-stream";
            if (!extension.StartsWith('.'))
                extension = "." + extension;
            return MimeTypes.GetType(extension);
        }

        public Task<List<StorageNode>> GetUserNodesAsync(Guid userId) =>
            _nodesRepository.GetManyAsync(x => x.OwnerId == userId);
        
        private string GetStorageLocation(Guid userId) => Path.GetFullPath(Path.Combine(_storageUrl, userId.ToString("N"), DriveDirName));
    }


}
