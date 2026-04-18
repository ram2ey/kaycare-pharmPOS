using PharmPOS.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace PharmPOS.Infrastructure.Data.Configurations;

public class SupplierConfiguration : IEntityTypeConfiguration<Supplier>
{
    public void Configure(EntityTypeBuilder<Supplier> builder)
    {
        builder.HasKey(s => s.SupplierId);
        builder.Property(s => s.SupplierId).HasDefaultValueSql("NEWSEQUENTIALID()");

        builder.Property(s => s.Name).HasMaxLength(200).IsRequired();
        builder.Property(s => s.ContactName).HasMaxLength(200);
        builder.Property(s => s.Phone).HasMaxLength(50);
        builder.Property(s => s.Email).HasMaxLength(200);
        builder.Property(s => s.Address).HasMaxLength(500);
        builder.Property(s => s.Notes).HasMaxLength(1000);

        builder.Property(s => s.CreatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
        builder.Property(s => s.UpdatedAt).HasDefaultValueSql("SYSUTCDATETIME()");

        // Unique supplier name per tenant
        builder.HasIndex(s => new { s.TenantId, s.Name }).IsUnique();

        builder.HasMany(s => s.PurchaseOrders)
               .WithOne(po => po.Supplier)
               .HasForeignKey(po => po.SupplierId)
               .OnDelete(DeleteBehavior.Restrict);
    }
}
