namespace PharmPOS.Core.DTOs.Users;

public class UserResponse
{
    public Guid   UserId        { get; set; }
    public string Email         { get; set; } = string.Empty;
    public string FirstName     { get; set; } = string.Empty;
    public string LastName      { get; set; } = string.Empty;
    public string FullName      { get; set; } = string.Empty;
    public int    RoleId        { get; set; }
    public string Role          { get; set; } = string.Empty;
    public string? PhoneNumber  { get; set; }
    public string? LicenseNumber { get; set; }
    public string? Department   { get; set; }
    public bool   IsActive      { get; set; }
    public bool   MustChangePassword { get; set; }
    public DateTime? LastLoginAt { get; set; }
    public DateTime  CreatedAt  { get; set; }
}
