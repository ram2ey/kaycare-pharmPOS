using PharmPOS.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace PharmPOS.Infrastructure.Data.Configurations;

public class StockMovementConfiguration : IEntityTypeConfiguration<StockMovement>
{
    public void Configure(EntityTypeBuilder<StockMovement> builder)
    {
        builder.HasKey(m => m.StockMovementId);
        builder.Property(m => m.StockMovementId).HasDefaultValueSql("NEWSEQUENTIALID()");

        builder.Property(m => m.MovementType).HasMaxLength(50).IsRequired();
        builder.Property(m => m.ReferenceType).HasMaxLength(100);
        builder.Property(m => m.Notes).HasMaxLength(500);

        builder.Property(m => m.CreatedAt).HasDefaultValueSql("SYSUTCDATETIME()");

        builder.HasIndex(m => new { m.TenantId, m.DrugInventoryId, m.CreatedAt });
        builder.HasIndex(m => new { m.TenantId, m.ReferenceId }).HasFilter("[ReferenceId] IS NOT NULL");

        builder.HasOne(m => m.CreatedBy)
               .WithMany()
               .HasForeignKey(m => m.CreatedByUserId)
               .OnDelete(DeleteBehavior.Restrict);
    }
}
