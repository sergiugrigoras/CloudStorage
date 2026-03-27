using Microsoft.EntityFrameworkCore;

namespace CloudStorage.Models;

public partial class AppDbContext : DbContext
{
    public AppDbContext()
    {
    }

    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }
    
    public virtual DbSet<ResetToken> ResetTokens { get; set; }
    public virtual DbSet<User> Users { get; set; }
    
    public virtual DbSet<InviteCode> InviteCodes { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
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
            entity.Property(e => e.Disabled)
                .IsRequired()
                .HasDefaultValue(false);
            entity.Property(e => e.TwoFaEnabled)
                .HasColumnName("TwoFAEnabled")
                .HasDefaultValue(false);
            entity.Property(e => e.TotpSecret)
                .HasColumnName("TOTPSecret");
        });
        
        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}