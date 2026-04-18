using PharmPOS.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace PharmPOS.Infrastructure.Data.Configurations;

public class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
{
    public void Configure(EntityTypeBuilder<AuditLog> builder)
    {
        builder.HasKey(a => a.AuditLogId);
        // BIGINT IDENTITY — database generates the value on insert
        builder.Property(a => a.AuditLogId).ValueGeneratedOnAdd();

        // Intentionally no FK on TenantId or UserId — records survive deletion
        builder.Property(a => a.TenantId).IsRequired();
        builder.Property(a => a.UserId).IsRequired();
        builder.Property(a => a.UserEmail).HasMaxLength(256).IsRequired();
        builder.Property(a => a.Action).HasMaxLength(100).IsRequired();
        builder.Property(a => a.EntityType).HasMaxLength(100).IsRequired();
        builder.Property(a => a.EntityId).IsRequired();
        builder.Property(a => a.Details).HasColumnType("nvarchar(max)");
        builder.Property(a => a.IpAddress).HasMaxLength(45); // supports IPv6
        builder.Property(a => a.Timestamp)
               .IsRequired()
               .HasDefaultValueSql("SYSUTCDATETIME()");

        builder.HasIndex(a => new { a.TenantId, a.UserId });
        builder.HasIndex(a => new { a.TenantId, a.Timestamp });
    }
}
