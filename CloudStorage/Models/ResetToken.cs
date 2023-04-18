using CloudStorage.Models;

namespace CloudStorage
{
    public partial class ResetToken
    {
        public int Id { get; set; }

        public Guid UserId { get; set; }

        public string TokenHash { get; set; }

        public DateTime ExpirationDate { get; set; }

        public bool TokenUsed { get; set; }

        public virtual User User { get; set; }
    }
}
