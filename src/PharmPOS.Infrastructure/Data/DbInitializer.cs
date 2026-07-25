using PharmPOS.Core.Constants;
using PharmPOS.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace PharmPOS.Infrastructure.Data;

public static class DbInitializer
{
    public static async Task InitializeAsync(AppDbContext db, ILogger logger)
    {
        try
        {
            logger.LogInformation("Applying EF Core PostgreSQL database migrations...");
            await db.Database.MigrateAsync();
            logger.LogInformation("Database migrations applied successfully.");

            // Check if default tenant exists
            var existingTenant = await db.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync();
            if (existingTenant is null)
            {
                logger.LogInformation("No tenant found. Initializing default 'main' tenant and admin account...");
                var mainTenantId = Guid.Parse("11111111-1111-1111-1111-111111111111");
                var now = DateTime.UtcNow;

                var tenant = new Tenant
                {
                    TenantId = mainTenantId,
                    TenantCode = "main",
                    TenantName = "PharmPOS Main Pharmacy",
                    Subdomain = "main",
                    TenantType = TenantType.PharmOS,
                    SubscriptionPlan = "Enterprise",
                    IsActive = true,
                    MaxUsers = 50,
                    StorageQuotaGB = 100,
                    CreatedAt = now,
                    UpdatedAt = now
                };

                db.Tenants.Add(tenant);
                await db.SaveChangesAsync();

                var passHash = BCrypt.Net.BCrypt.HashPassword("PharmPOS@2026!", 12);
                var adminUserId = Guid.NewGuid();

                // Raw SQL insertion to avoid TenantId override from SaveChangesAsync
                await db.Database.ExecuteSqlInterpolatedAsync($@"
                    INSERT INTO ""Users""
                      (""UserId"", ""TenantId"", ""RoleId"", ""Email"", ""PasswordHash"",
                       ""FirstName"", ""LastName"", ""IsActive"", ""MustChangePassword"",
                       ""FailedLoginCount"", ""CreatedAt"", ""UpdatedAt"")
                    VALUES
                      ({adminUserId}, {mainTenantId}, {2}, 'admin@pharmpos.com',
                       {passHash}, 'System', 'Admin',
                       true, false, 0, {now}, {now})");

                logger.LogInformation("Default tenant ('main') and Admin account ('admin@pharmpos.com') created successfully.");
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "An error occurred during database initialization / migration.");
            throw;
        }
    }
}
