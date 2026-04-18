using PharmPOS.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace PharmPOS.Infrastructure.Data.Configurations;

public class TenantConfiguration : IEntityTypeConfiguration<Tenant>
{
    public void Configure(EntityTypeBuilder<Tenant> builder)
    {
        builder.HasKey(t => t.TenantId);
        builder.Property(t => t.TenantId).HasDefaultValueSql("NEWSEQUENTIALID()");
        builder.Property(t => t.TenantCode).HasMaxLength(50).IsRequired();
        builder.Property(t => t.TenantName).HasMaxLength(200).IsRequired();
        builder.Property(t => t.Subdomain).HasMaxLength(100).IsRequired();
        builder.Property(t => t.SubscriptionPlan).HasMaxLength(50).HasDefaultValue("standard");
        builder.Property(t => t.CreatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
        builder.Property(t => t.UpdatedAt).HasDefaultValueSql("SYSUTCDATETIME()");

        builder.HasIndex(t => t.TenantCode).IsUnique();
        builder.HasIndex(t => t.Subdomain).IsUnique();
    }
}
