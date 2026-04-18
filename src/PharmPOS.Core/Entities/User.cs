namespace PharmPOS.Core.Entities;

public class User : TenantEntity
{
    public Guid UserId { get; set; }
    public int RoleId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string? LicenseNumber { get; set; }
    public string? Department { get; set; }
    public bool IsActive { get; set; } = true;
    public bool MustChangePassword { get; set; } = true;
    public DateTime? LastLoginAt { get; set; }
    public int FailedLoginCount { get; set; }
    public DateTime? LockedUntil { get; set; }
    public Guid? CreatedByUserId { get; set; }

    public Tenant Tenant { get; set; } = null!;
    public Role Role { get; set; } = null!;
}
