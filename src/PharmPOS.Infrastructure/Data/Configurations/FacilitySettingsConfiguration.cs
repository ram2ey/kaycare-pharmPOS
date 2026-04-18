using PharmPOS.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace PharmPOS.Infrastructure.Data.Configurations;

public class FacilitySettingsConfiguration : IEntityTypeConfiguration<FacilitySettings>
{
    public void Configure(EntityTypeBuilder<FacilitySettings> builder)
    {
        builder.HasKey(f => f.FacilitySettingsId);
        builder.Property(f => f.FacilitySettingsId).HasDefaultValueSql("NEWSEQUENTIALID()");

        builder.Property(f => f.FacilityName).HasMaxLength(200).IsRequired();
        builder.Property(f => f.Address).HasMaxLength(500);
        builder.Property(f => f.Phone).HasMaxLength(50);
        builder.Property(f => f.Email).HasMaxLength(200);
        builder.Property(f => f.LogoBlobName).HasMaxLength(200);

        builder.Property(f => f.CreatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
        builder.Property(f => f.UpdatedAt).HasDefaultValueSql("SYSUTCDATETIME()");

        // One FacilitySettings per tenant
        builder.HasIndex(f => f.TenantId).IsUnique();
    }
}
