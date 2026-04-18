using PharmPOS.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace PharmPOS.Infrastructure.Data.Configurations;

public class RoleConfiguration : IEntityTypeConfiguration<Role>
{
    public void Configure(EntityTypeBuilder<Role> builder)
    {
        builder.HasKey(r => r.RoleId);
        builder.Property(r => r.RoleId).ValueGeneratedOnAdd();
        builder.Property(r => r.RoleName).HasMaxLength(50).IsRequired();
        builder.Property(r => r.Description).HasMaxLength(200);
        builder.HasIndex(r => r.RoleName).IsUnique();

        // Seed application roles
        builder.HasData(
            new Role { RoleId = 1, RoleName = "SuperAdmin",   Description = "Platform-level administrator" },
            new Role { RoleId = 2, RoleName = "Admin",        Description = "Pharmacy administrator" },
            new Role { RoleId = 3, RoleName = "Pharmacist",   Description = "Pharmacy staff" }
        );
    }
}
