using PharmPOS.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace PharmPOS.Infrastructure.Data.Configurations;

public class DrugInventoryConfiguration : IEntityTypeConfiguration<DrugInventory>
{
    public void Configure(EntityTypeBuilder<DrugInventory> builder)
    {
        builder.HasKey(d => d.DrugInventoryId);
        builder.Property(d => d.DrugInventoryId).HasDefaultValueSql("NEWSEQUENTIALID()");

        builder.Property(d => d.Name).HasMaxLength(200).IsRequired();
        builder.Property(d => d.GenericName).HasMaxLength(200);
        builder.Property(d => d.DosageForm).HasMaxLength(100);
        builder.Property(d => d.Strength).HasMaxLength(100);
        builder.Property(d => d.Unit).HasMaxLength(50).IsRequired();
        builder.Property(d => d.Category).HasMaxLength(100);
        builder.Property(d => d.UnitCost).HasColumnType("decimal(12,2)");
        builder.Property(d => d.SellingPrice).HasColumnType("decimal(12,2)");

        builder.Property(d => d.CreatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
        builder.Property(d => d.UpdatedAt).HasDefaultValueSql("SYSUTCDATETIME()");

        // Unique per tenant: same drug name + form + strength cannot be duplicated
        builder.HasIndex(d => new { d.TenantId, d.Name, d.DosageForm, d.Strength })
               .IsUnique();

        builder.HasMany(d => d.StockMovements)
               .WithOne(m => m.DrugInventory)
               .HasForeignKey(m => m.DrugInventoryId)
               .OnDelete(DeleteBehavior.Restrict);
    }
}
