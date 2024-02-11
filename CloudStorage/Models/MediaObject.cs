using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CloudStorage.Models;

public partial class MediaObject
{
    [NotMapped]
    private const string snapshotExtension = ".jpg";
    
    [Key]
    public Guid Id { get; set; }

    public string UploadFileName { get; set; }

    public string ContentType { get; set; }

    public string Hash { get; set; }

    public int? Width { get; set; }

    public int? Height { get; set; }

    public int? Duration { get; set; }

    public bool Favorite { get; set; }
    public bool MarkedForDeletion { get; set; }

    public Guid OwnerId { get; set; }

    public virtual User Owner { get; set; }
    public virtual ICollection<MediaAlbum> MediaAlbums { get; set; } = new List<MediaAlbum>();

    public string Snapshot { get { return Hash + snapshotExtension; } }
}
