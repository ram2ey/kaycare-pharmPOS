using System.ComponentModel.DataAnnotations;

namespace PharmPOS.Core.DTOs.Users;

public class UpdateUserRequest
{
    [Required, MaxLength(100)]
    public string FirstName { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string LastName { get; set; } = string.Empty;

    [Required]
    public int RoleId { get; set; }

    [MaxLength(20)]
    public string? PhoneNumber { get; set; }

    [MaxLength(50)]
    public string? LicenseNumber { get; set; }

    [MaxLength(100)]
    public string? Department { get; set; }
}
