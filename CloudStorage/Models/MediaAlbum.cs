using System;
using System.Collections.Generic;

namespace CloudStorage.Models;

public partial class MediaAlbum
{
    public Guid Id { get; set; }

    public string Name { get; set; }

    public Guid? OwnerId { get; set; }

    public DateTime CreateDate { get; set; }

    public DateTime? LastUpdate { get; set; }

    public virtual User Owner { get; set; }

    public virtual ICollection<MediaObject> MediaObjects { get; set; } = new List<MediaObject>();
}
