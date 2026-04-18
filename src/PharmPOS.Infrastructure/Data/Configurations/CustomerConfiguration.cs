using PharmPOS.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace PharmPOS.Infrastructure.Data.Configurations;

public class CustomerConfiguration : IEntityTypeConfiguration<Customer>
{
    public void Configure(EntityTypeBuilder<Customer> builder)
    {
        builder.HasKey(c => c.CustomerId);
        builder.Property(c => c.CustomerId).HasDefaultValueSql("NEWSEQUENTIALID()");

        builder.Property(c => c.Name).HasMaxLength(200).IsRequired();
        builder.Property(c => c.Phone).HasMaxLength(50);
        builder.Property(c => c.Email).HasMaxLength(200);
        builder.Property(c => c.Notes).HasMaxLength(1000);

        builder.Property(c => c.CreatedAt).HasDefaultValueSql("SYSUTCDATETIME()");
        builder.Property(c => c.UpdatedAt).HasDefaultValueSql("SYSUTCDATETIME()");

        builder.HasIndex(c => new { c.TenantId, c.Name });
        builder.HasIndex(c => new { c.TenantId, c.Phone });

        builder.HasMany(c => c.Sales)
               .WithOne(s => s.Customer)
               .HasForeignKey(s => s.CustomerId)
               .OnDelete(DeleteBehavior.SetNull);
    }
}
