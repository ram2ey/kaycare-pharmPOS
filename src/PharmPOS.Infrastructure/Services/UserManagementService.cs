using PharmPOS.Core.DTOs.Users;
using PharmPOS.Core.Entities;
using PharmPOS.Core.Exceptions;
using PharmPOS.Core.Interfaces;
using PharmPOS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace PharmPOS.Infrastructure.Services;

public class UserManagementService : IUserManagementService
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenantContext;

    public UserManagementService(AppDbContext db, ITenantContext tenantContext)
    {
        _db = db;
        _tenantContext = tenantContext;
    }

    public async Task<List<UserResponse>> GetAllAsync(bool includeInactive = false, string? role = null, CancellationToken ct = default)
    {
        var query = _db.Users
            .Include(u => u.Role)
            .IgnoreQueryFilters()
            .Where(u => u.TenantId == _tenantContext.TenantId);

        if (!includeInactive)
            query = query.Where(u => u.IsActive);

        if (!string.IsNullOrWhiteSpace(role))
            query = query.Where(u => u.Role.RoleName == role);

        var users = await query
            .OrderBy(u => u.LastName)
            .ThenBy(u => u.FirstName)
            .ToListAsync(ct);

        return users.Select(Map).ToList();
    }

    public async Task<UserResponse> GetByIdAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await FindAsync(userId, ct);
        return Map(user);
    }

    public async Task<UserResponse> CreateAsync(CreateUserRequest request, CancellationToken ct = default)
    {
        var email = request.Email.Trim().ToLowerInvariant();

        var exists = await _db.Users
            .IgnoreQueryFilters()
            .AnyAsync(u => u.TenantId == _tenantContext.TenantId && u.Email == email, ct);

        if (exists)
            throw new ConflictException("A user with this email already exists.");

        var role = await _db.Roles.FindAsync([request.RoleId], ct)
            ?? throw new NotFoundException("Role", request.RoleId);

        var user = new User
        {
            UserId          = Guid.NewGuid(),
            TenantId        = _tenantContext.TenantId,
            RoleId          = request.RoleId,
            Email           = email,
            PasswordHash    = BCrypt.Net.BCrypt.HashPassword(request.Password, workFactor: 12),
            FirstName       = request.FirstName.Trim(),
            LastName        = request.LastName.Trim(),
            PhoneNumber     = request.PhoneNumber?.Trim(),
            LicenseNumber   = request.LicenseNumber?.Trim(),
            Department      = request.Department?.Trim(),
            IsActive        = true,
            MustChangePassword = true,
            CreatedAt       = DateTime.UtcNow,
            UpdatedAt       = DateTime.UtcNow,
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync(ct);

        user.Role = role;
        return Map(user);
    }

    public async Task<UserResponse> UpdateAsync(Guid userId, UpdateUserRequest request, CancellationToken ct = default)
    {
        var user = await FindAsync(userId, ct);

        var role = await _db.Roles.FindAsync([request.RoleId], ct)
            ?? throw new NotFoundException("Role", request.RoleId);

        user.FirstName     = request.FirstName.Trim();
        user.LastName      = request.LastName.Trim();
        user.RoleId        = request.RoleId;
        user.PhoneNumber   = request.PhoneNumber?.Trim();
        user.LicenseNumber = request.LicenseNumber?.Trim();
        user.Department    = request.Department?.Trim();
        user.UpdatedAt     = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);

        user.Role = role;
        return Map(user);
    }

    public async Task DeactivateAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await FindAsync(userId, ct);
        user.IsActive  = false;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
    }

    public async Task ReactivateAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await FindAsync(userId, ct);
        user.IsActive  = true;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
    }

    public async Task ResetPasswordAsync(Guid userId, ResetPasswordRequest request, CancellationToken ct = default)
    {
        var user = await FindAsync(userId, ct);
        user.PasswordHash      = BCrypt.Net.BCrypt.HashPassword(request.NewPassword, workFactor: 12);
        user.MustChangePassword = true;
        user.FailedLoginCount  = 0;
        user.LockedUntil       = null;
        user.UpdatedAt         = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
    }

    public async Task<List<DepartmentSummary>> GetDepartmentsAsync(CancellationToken ct = default)
    {
        return await _db.Users
            .IgnoreQueryFilters()
            .Where(u => u.TenantId == _tenantContext.TenantId
                     && u.Department != null
                     && u.Department != string.Empty)
            .GroupBy(u => u.Department!)
            .Select(g => new DepartmentSummary { Name = g.Key, UserCount = g.Count() })
            .OrderBy(d => d.Name)
            .ToListAsync(ct);
    }

    public async Task RenameDepartmentAsync(RenameDepartmentRequest request, CancellationToken ct = default)
    {
        var oldName = request.OldName.Trim();
        var newName = request.NewName.Trim();

        if (string.IsNullOrWhiteSpace(oldName) || string.IsNullOrWhiteSpace(newName))
            throw new PharmPOS.Core.Exceptions.ValidationException("Department names cannot be empty.");

        if (string.Equals(oldName, newName, StringComparison.OrdinalIgnoreCase))
            return;

        var users = await _db.Users
            .IgnoreQueryFilters()
            .Where(u => u.TenantId == _tenantContext.TenantId && u.Department == oldName)
            .ToListAsync(ct);

        foreach (var user in users)
        {
            user.Department = newName;
            user.UpdatedAt  = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync(ct);
    }

    // ── helpers ────────────────────────────────────────────────────────────────

    private async Task<User> FindAsync(Guid userId, CancellationToken ct)
    {
        var user = await _db.Users
            .Include(u => u.Role)
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.UserId == userId && u.TenantId == _tenantContext.TenantId, ct)
            ?? throw new NotFoundException("User", userId);
        return user;
    }

    private static UserResponse Map(User u) => new()
    {
        UserId           = u.UserId,
        Email            = u.Email,
        FirstName        = u.FirstName,
        LastName         = u.LastName,
        FullName         = $"{u.FirstName} {u.LastName}",
        RoleId           = u.RoleId,
        Role             = u.Role?.RoleName ?? string.Empty,
        PhoneNumber      = u.PhoneNumber,
        LicenseNumber    = u.LicenseNumber,
        Department       = u.Department,
        IsActive         = u.IsActive,
        MustChangePassword = u.MustChangePassword,
        LastLoginAt      = u.LastLoginAt,
        CreatedAt        = u.CreatedAt,
    };
}
