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

            // Check if default 'main' tenant exists
            var mainTenant = await db.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.TenantCode == "main");
            if (mainTenant is null)
            {
                logger.LogInformation("Initializing default 'main' tenant...");
                var mainTenantId = Guid.Parse("11111111-1111-1111-1111-111111111111");
                var now = DateTime.UtcNow;

                mainTenant = new Tenant
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

                db.Tenants.Add(mainTenant);
                await db.SaveChangesAsync();
                logger.LogInformation("Default 'main' tenant created successfully.");
            }

            // Check if default Admin account exists
            var adminUser = await db.Users.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Email == "admin@pharmpos.com");
            if (adminUser is null)
            {
                logger.LogInformation("Initializing default Admin account ('admin@pharmpos.com')...");
                var passHash = BCrypt.Net.BCrypt.HashPassword("PharmPOS@2026!", 12);
                var adminUserId = Guid.NewGuid();
                var now = DateTime.UtcNow;

                await db.Database.ExecuteSqlInterpolatedAsync($@"
                    INSERT INTO ""Users""
                      (""UserId"", ""TenantId"", ""RoleId"", ""Email"", ""PasswordHash"",
                       ""FirstName"", ""LastName"", ""IsActive"", ""MustChangePassword"",
                       ""FailedLoginCount"", ""CreatedAt"", ""UpdatedAt"")
                    VALUES
                      ({adminUserId}, {mainTenant.TenantId}, {2}, 'admin@pharmpos.com',
                       {passHash}, 'System', 'Admin',
                       true, false, 0, {now}, {now})");

                logger.LogInformation("Default Admin account ('admin@pharmpos.com') created successfully.");
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "An error occurred during database initialization / migration.");
            throw;
        }
    }
}
