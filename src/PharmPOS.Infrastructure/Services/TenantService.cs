using PharmPOS.Core.DTOs.Tenants;
using PharmPOS.Core.Entities;
using PharmPOS.Core.Exceptions;
using PharmPOS.Core.Interfaces;
using PharmPOS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace PharmPOS.Infrastructure.Services;

public class TenantService(AppDbContext db) : ITenantService
{
    public async Task<List<TenantResponse>> GetAllAsync(CancellationToken ct = default)
    {
        var tenants = await db.Tenants
            .OrderBy(t => t.TenantName)
            .ToListAsync(ct);

        var userCounts = await db.Users
            .GroupBy(u => u.TenantId)
            .Select(g => new { TenantId = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        var countMap = userCounts.ToDictionary(x => x.TenantId, x => x.Count);

        return tenants.Select(t => ToResponse(t, countMap.GetValueOrDefault(t.TenantId))).ToList();
    }

    public async Task<TenantResponse?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var tenant = await db.Tenants.FindAsync([id], ct);
        if (tenant is null) return null;

        var count = await db.Users.CountAsync(u => u.TenantId == id, ct);
        return ToResponse(tenant, count);
    }

    public async Task<TenantResponse> CreateAsync(CreateTenantRequest req, CancellationToken ct = default)
    {
        var code = req.TenantCode.Trim().ToLowerInvariant();

        if (await db.Tenants.AnyAsync(t => t.TenantCode == code, ct))
            throw new ConflictException($"Tenant code '{code}' is already in use.");

        if (await db.Users.AnyAsync(u => u.Email == req.AdminEmail.Trim().ToLowerInvariant(), ct))
            throw new ConflictException($"Email '{req.AdminEmail}' is already registered.");

        var now      = DateTime.UtcNow;
        var tenantId = Guid.NewGuid();

        var tenant = new Tenant
        {
            TenantId         = tenantId,
            TenantCode       = code,
            TenantName       = req.TenantName.Trim(),
            Subdomain        = code,
            TenantType       = req.TenantType,
            SubscriptionPlan = req.SubscriptionPlan,
            IsActive         = true,
            MaxUsers         = req.MaxUsers,
            StorageQuotaGB   = req.StorageQuotaGB,
            CreatedAt        = now,
            UpdatedAt        = now,
        };

        // Temporary password — admin must change on first login
        var tempPassword = $"Welcome@{DateTime.UtcNow.Year}!";
        var hash         = BCrypt.Net.BCrypt.HashPassword(tempPassword, 12);

        var adminUser = new
        {
            UserId        = Guid.NewGuid(),
            RoleId        = 2, // Admin
            Email         = req.AdminEmail.Trim().ToLowerInvariant(),
            PasswordHash  = hash,
            FirstName     = req.AdminFirstName.Trim(),
            LastName      = req.AdminLastName.Trim(),
        };

        db.Tenants.Add(tenant);
        await db.SaveChangesAsync(ct);

        // Insert admin user via raw SQL — SaveChangesAsync auto-injects TenantId from TenantContext
        // which would overwrite the new tenant's TenantId with the calling SuperAdmin's tenant.
        await db.Database.ExecuteSqlInterpolatedAsync($@"
            INSERT INTO Users
              (UserId, TenantId, RoleId, Email, PasswordHash,
               FirstName, LastName, IsActive, MustChangePassword,
               FailedLoginCount, CreatedAt, UpdatedAt)
            VALUES
              ({adminUser.UserId}, {tenantId}, {adminUser.RoleId}, {adminUser.Email},
               {adminUser.PasswordHash}, {adminUser.FirstName}, {adminUser.LastName},
               {1}, {1}, {0}, {now}, {now})", ct);

        return ToResponse(tenant, 1);
    }

    public async Task<TenantResponse> UpdateAsync(Guid id, UpdateTenantRequest req, CancellationToken ct = default)
    {
        var tenant = await db.Tenants.FindAsync([id], ct)
            ?? throw new NotFoundException("Tenant", id);

        tenant.TenantName       = req.TenantName.Trim();
        tenant.TenantType       = req.TenantType;
        tenant.SubscriptionPlan = req.SubscriptionPlan;
        tenant.MaxUsers         = req.MaxUsers;
        tenant.StorageQuotaGB   = req.StorageQuotaGB;
        tenant.UpdatedAt        = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);

        var count = await db.Users.CountAsync(u => u.TenantId == id, ct);
        return ToResponse(tenant, count);
    }

    public async Task<TenantResponse> SetActiveAsync(Guid id, bool isActive, CancellationToken ct = default)
    {
        var tenant = await db.Tenants.FindAsync([id], ct)
            ?? throw new NotFoundException("Tenant", id);

        tenant.IsActive  = isActive;
        tenant.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        var count = await db.Users.CountAsync(u => u.TenantId == id, ct);
        return ToResponse(tenant, count);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var tenant = await db.Tenants.FindAsync([id], ct)
            ?? throw new NotFoundException("Tenant", id);

        db.Tenants.Remove(tenant);
        await db.SaveChangesAsync(ct);
    }

    private static TenantResponse ToResponse(Tenant t, int userCount) => new()
    {
        TenantId         = t.TenantId,
        TenantCode       = t.TenantCode,
        TenantName       = t.TenantName,
        Subdomain        = t.Subdomain,
        TenantType       = t.TenantType,
        SubscriptionPlan = t.SubscriptionPlan,
        IsActive         = t.IsActive,
        MaxUsers         = t.MaxUsers,
        StorageQuotaGB   = t.StorageQuotaGB,
        UserCount        = userCount,
        CreatedAt        = t.CreatedAt,
    };
}
