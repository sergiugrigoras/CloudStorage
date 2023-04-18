using CloudStorage.Models;
using System;
using System.Collections.Generic;

namespace CloudStorage.Models
{
    public partial class Share
    {
        public int Id { get; set; }

        public Guid PublicId { get; set; }

        public Guid UserId { get; set; }

        public DateTime ShareDate { get; set; }

        public virtual User User { get; set; }

        public virtual ICollection<FileSystemObject> Fsos { get; } = new List<FileSystemObject>();
    }

    public class ShareDTO
    {
        public int Id { get; set; }
        public Guid PublicId { get; set; }
        public Guid UserId { get; set; }
        public DateTime ShareDate { get; set; }
        public ICollection<FileSystemObjectViewModel> Content { get; set; }
        public ShareDTO(Share share)
        {
            Id = share.Id;
            PublicId = share.PublicId;
            UserId = share.UserId;
            ShareDate = share.ShareDate;
        }
    }
}
