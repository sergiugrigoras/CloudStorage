using System;
using System.Collections.Generic;

namespace CloudStorage.Models;

public partial class MediaObject
{
    public Guid Id { get; set; }

    public string UploadFileName { get; set; }

    public string ContentType { get; set; }

    public string Hash { get; set; }

    public string Snapshot { get; set; }

    public bool Favorite { get; set; }

    public Guid OwnerId { get; set; }

    public virtual User Owner { get; set; }
}
