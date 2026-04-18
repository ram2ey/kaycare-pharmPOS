using PharmPOS.Core.DTOs.Auth;
using PharmPOS.Core.Exceptions;
using PharmPOS.Core.Interfaces;
using PharmPOS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace PharmPOS.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly ITokenService _tokenService;
    private readonly ITenantContext _tenantContext;

    public AuthService(AppDbContext db, ITokenService tokenService, ITenantContext tenantContext)
    {
        _db = db;
        _tokenService = tokenService;
        _tenantContext = tenantContext;
    }

    public async Task<LoginResponse> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        var email = request.Email.Trim().ToLowerInvariant();

        // IgnoreQueryFilters: we filter by TenantId explicitly so the global filter isn't double-applied
        var user = await _db.Users
            .Include(u => u.Role)
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.TenantId == _tenantContext.TenantId && u.Email == email, ct);

        if (user is null || !user.IsActive)
            throw new UnauthorizedException();

        // Account lockout check: 5 failed attempts = 30 min lock
        if (user.LockedUntil.HasValue && user.LockedUntil > DateTime.UtcNow)
            throw new AccountLockedException(user.LockedUntil.Value);

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            user.FailedLoginCount++;
            if (user.FailedLoginCount >= 5)
                user.LockedUntil = DateTime.UtcNow.AddMinutes(30);

            user.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
            throw new UnauthorizedException();
        }

        // Success — reset lockout state
        user.FailedLoginCount = 0;
        user.LockedUntil = null;
        user.LastLoginAt = DateTime.UtcNow;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        var tenant = await _db.Tenants.AsNoTracking()
            .FirstOrDefaultAsync(t => t.TenantId == _tenantContext.TenantId, ct);

        var expiryHours = 8;
        return new LoginResponse
        {
            Token              = _tokenService.GenerateToken(user, user.Role.RoleName),
            ExpiresAt          = DateTime.UtcNow.AddHours(expiryHours),
            UserId             = user.UserId.ToString(),
            Email              = user.Email,
            FullName           = $"{user.FirstName} {user.LastName}",
            Role               = user.Role.RoleName,
            MustChangePassword = user.MustChangePassword,
            TenantType         = tenant?.TenantType ?? Core.Constants.TenantType.PharmOS,
        };
    }

    public async Task ChangePasswordAsync(Guid userId, ChangePasswordRequest request, CancellationToken ct = default)
    {
        var user = await _db.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.UserId == userId && u.TenantId == _tenantContext.TenantId, ct)
            ?? throw new UnauthorizedException("User not found.");

        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            throw new ValidationException("Current password is incorrect.");

        user.PasswordHash       = BCrypt.Net.BCrypt.HashPassword(request.NewPassword, workFactor: 12);
        user.MustChangePassword = false;
        user.FailedLoginCount   = 0;
        user.LockedUntil        = null;
        user.UpdatedAt          = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
    }
}
