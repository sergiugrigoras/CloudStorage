using Microsoft.EntityFrameworkCore;

namespace CloudStorage.Models
{
    public partial class AppDbContext : DbContext
    {
        public AppDbContext()
        {
        }

        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options)
        {
        }

        public virtual DbSet<FileSystemObject> FileSystemObjects { get; set; }

        public virtual DbSet<Note> Notes { get; set; }

        public virtual DbSet<ResetToken> ResetTokens { get; set; }

        public virtual DbSet<Share> Shares { get; set; }

        public virtual DbSet<User> Users { get; set; }

        public virtual DbSet<MediaObject> MediaObjects { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<MediaObject>(entity =>
            {
                entity.HasKey(e => e.Id).HasName("PK__MediaObj__3214EC077A42B899");

                entity.ToTable("MediaObject");

                entity.Property(e => e.Id).ValueGeneratedNever();
                entity.Property(e => e.ContentType)
                    .HasMaxLength(100)
                    .IsUnicode(false);
                entity.Property(e => e.Hash)
                    .IsRequired()
                    .HasMaxLength(100)
                    .IsUnicode(false);
                entity.Property(e => e.Snapshot)
                    .HasMaxLength(100)
                    .IsUnicode(false);
                entity.Property(e => e.UploadFileName)
                    .IsRequired()
                    .HasMaxLength(255)
                    .IsUnicode(false);

                entity.HasOne(d => d.Owner).WithMany(p => p.MediaObjects)
                    .HasForeignKey(d => d.OwnerId)
                    .HasConstraintName("FK_Media_User");
            });

            modelBuilder.Entity<FileSystemObject>(entity =>
            {
                entity.HasKey(e => e.Id).HasName("PK__FileSyst__3214EC077F02147E");

                entity.ToTable("FileSystemObject");

                entity.Property(e => e.Date).HasColumnType("datetime");
                entity.Property(e => e.FileName)
                    .HasMaxLength(40)
                    .IsUnicode(false);
                entity.Property(e => e.Name)
                    .IsRequired()
                    .HasMaxLength(100)
                    .IsUnicode(false);
                entity.Property(e => e.ParentId).HasColumnName("ParentID");

                entity.HasOne(d => d.Owner).WithMany(p => p.FileSystemObjects)
                    .HasForeignKey(d => d.OwnerId)
                    .HasConstraintName("FK_FSO_User");

                entity.HasOne(d => d.Parent).WithMany(p => p.Children)
                    .HasForeignKey(d => d.ParentId)
                    .HasConstraintName("FK__FileSyste__Paren__74AE54BC");
            });

            modelBuilder.Entity<Note>(entity =>
            {
                entity.HasKey(e => e.Id).HasName("PK__Note__3214EC07447CE5E5");

                entity.ToTable("Note");

                entity.Property(e => e.Color).HasMaxLength(50);
                entity.Property(e => e.CreationDate).HasColumnType("datetime");
                entity.Property(e => e.ModificationDate).HasColumnType("datetime");
                entity.Property(e => e.Title).HasMaxLength(255);
                entity.Property(e => e.Type)
                    .HasMaxLength(50)
                    .IsUnicode(false)
                    .HasDefaultValueSql("('text')");

                entity.HasOne(d => d.User).WithMany(p => p.Notes)
                    .HasForeignKey(d => d.UserId)
                    .OnDelete(DeleteBehavior.ClientSetNull)
                    .HasConstraintName("FK_Note_Users");
            });

            modelBuilder.Entity<ResetToken>(entity =>
            {
                entity.HasKey(e => e.Id).HasName("PK__ResetTok__3214EC07DA0D1D7C");

                entity.ToTable("ResetToken");

                entity.Property(e => e.ExpirationDate).HasColumnType("datetime");
                entity.Property(e => e.TokenHash)
                    .IsRequired()
                    .HasMaxLength(255);

                entity.HasOne(d => d.User).WithMany(p => p.ResetTokens)
                    .HasForeignKey(d => d.UserId)
                    .OnDelete(DeleteBehavior.ClientSetNull)
                    .HasConstraintName("FK_ResetToken_User");
            });

            modelBuilder.Entity<Share>(entity =>
            {
                entity.HasKey(e => e.Id).HasName("PK__Share__3214EC0756320B2F");

                entity.ToTable("Share");

                entity.Property(e => e.ShareDate).HasColumnType("datetime");

                entity.HasOne(d => d.User).WithMany(p => p.Shares)
                    .HasForeignKey(d => d.UserId)
                    .OnDelete(DeleteBehavior.ClientSetNull)
                    .HasConstraintName("FK_Share_User");

                entity.HasMany(d => d.Fsos).WithMany(p => p.Shares)
                    .UsingEntity<Dictionary<string, object>>(
                        "ShareFso",
                        r => r.HasOne<FileSystemObject>().WithMany()
                            .HasForeignKey("FsoId")
                            .HasConstraintName("FK_Fso"),
                        l => l.HasOne<Share>().WithMany()
                            .HasForeignKey("ShareId")
                            .HasConstraintName("FK_Share"),
                        j =>
                        {
                            j.HasKey("ShareId", "FsoId");
                            j.ToTable("ShareFso");
                        });
            });

            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(e => e.Id).HasName("PK__User__3214EC070FAA7A84");

                entity.ToTable("User");

                entity.Property(e => e.Id).ValueGeneratedNever();
                entity.Property(e => e.Email).HasMaxLength(255);
                entity.Property(e => e.Password)
                    .IsRequired()
                    .HasMaxLength(255);
                entity.Property(e => e.RefreshToken).HasMaxLength(255);
                entity.Property(e => e.RefreshTokenExpiryTime).HasColumnType("datetime");
                entity.Property(e => e.Username)
                    .IsRequired()
                    .HasMaxLength(255);
            });

            OnModelCreatingPartial(modelBuilder);
        }

        partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
    }
}
