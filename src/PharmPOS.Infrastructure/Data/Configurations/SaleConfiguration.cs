using PharmPOS.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace PharmPOS.Infrastructure.Data.Configurations;

public class SaleConfiguration : IEntityTypeConfiguration<Sale>
{
    public void Configure(EntityTypeBuilder<Sale> builder)
    {
        builder.HasKey(s => s.SaleId);
        builder.Property(s => s.SaleId).HasDefaultValueSql("NEWSEQUENTIALID()");

        builder.Property(s => s.SaleNumber).HasMaxLength(20).IsRequired();
        builder.Property(s => s.CustomerName).HasMaxLength(200).IsRequired();
        builder.Property(s => s.PaymentMethod).HasMaxLength(50).IsRequired();
        builder.Property(s => s.TotalAmount).HasColumnType("decimal(12,2)");
        builder.Property(s => s.DiscountAmount).HasColumnType("decimal(12,2)");
        builder.Property(s => s.PaidAmount).HasColumnType("decimal(12,2)");
        builder.Property(s => s.Change).HasColumnType("decimal(12,2)");
        builder.Property(s => s.Notes).HasMaxLength(1000);
        builder.Property(s => s.VoidReason).HasMaxLength(500);

        builder.Property(s => s.SaleDate).HasDefaultValueSql("SYSUTCDATETIME()");
        builder.Property(s => s.CreatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
        builder.Property(s => s.UpdatedAt).HasDefaultValueSql("SYSUTCDATETIME()");

        builder.HasIndex(s => new { s.TenantId, s.SaleNumber }).IsUnique();
        builder.HasIndex(s => new { s.TenantId, s.SaleDate });

        builder.HasOne(s => s.Customer)
               .WithMany(c => c.Sales)
               .HasForeignKey(s => s.CustomerId)
               .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(s => s.SoldBy)
               .WithMany()
               .HasForeignKey(s => s.SoldByUserId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(s => s.Items)
               .WithOne(i => i.Sale)
               .HasForeignKey(i => i.SaleId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}

public class SaleItemConfiguration : IEntityTypeConfiguration<SaleItem>
{
    public void Configure(EntityTypeBuilder<SaleItem> builder)
    {
        builder.HasKey(i => i.SaleItemId);
        builder.Property(i => i.SaleItemId).HasDefaultValueSql("NEWSEQUENTIALID()");

        builder.Property(i => i.DrugName).HasMaxLength(200).IsRequired();
        builder.Property(i => i.DosageForm).HasMaxLength(100);
        builder.Property(i => i.Strength).HasMaxLength(100);
        builder.Property(i => i.UnitPrice).HasColumnType("decimal(12,2)");
        builder.Property(i => i.TotalPrice).HasColumnType("decimal(12,2)");

        builder.HasOne(i => i.Drug)
               .WithMany()
               .HasForeignKey(i => i.DrugInventoryId)
               .OnDelete(DeleteBehavior.SetNull);
    }
}
