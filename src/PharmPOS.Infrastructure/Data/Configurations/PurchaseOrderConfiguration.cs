using PharmPOS.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace PharmPOS.Infrastructure.Data.Configurations;

public class PurchaseOrderConfiguration : IEntityTypeConfiguration<PurchaseOrder>
{
    public void Configure(EntityTypeBuilder<PurchaseOrder> builder)
    {
        builder.HasKey(po => po.PurchaseOrderId);
        builder.Property(po => po.PurchaseOrderId).HasDefaultValueSql("NEWSEQUENTIALID()");

        builder.Property(po => po.OrderNumber).HasMaxLength(30).IsRequired();
        builder.Property(po => po.Status).HasMaxLength(30).IsRequired();
        builder.Property(po => po.Notes).HasMaxLength(1000);

        builder.Property(po => po.CreatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
        builder.Property(po => po.UpdatedAt).HasDefaultValueSql("SYSUTCDATETIME()");

        // Unique order number per tenant
        builder.HasIndex(po => new { po.TenantId, po.OrderNumber }).IsUnique();

        // Index for status filtering
        builder.HasIndex(po => new { po.TenantId, po.Status });

        builder.HasMany(po => po.Items)
               .WithOne(i => i.PurchaseOrder)
               .HasForeignKey(i => i.PurchaseOrderId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}

public class PurchaseOrderItemConfiguration : IEntityTypeConfiguration<PurchaseOrderItem>
{
    public void Configure(EntityTypeBuilder<PurchaseOrderItem> builder)
    {
        builder.HasKey(i => i.PurchaseOrderItemId);
        builder.Property(i => i.PurchaseOrderItemId).HasDefaultValueSql("NEWSEQUENTIALID()");

        builder.Property(i => i.UnitCost).HasColumnType("decimal(12,2)");

        builder.HasIndex(i => new { i.TenantId, i.PurchaseOrderId });

        builder.HasOne(i => i.DrugInventory)
               .WithMany()
               .HasForeignKey(i => i.DrugInventoryId)
               .OnDelete(DeleteBehavior.Restrict);
    }
}
