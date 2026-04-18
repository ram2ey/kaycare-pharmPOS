using System.ComponentModel.DataAnnotations;

namespace PharmPOS.Core.DTOs.Users;

public class ResetPasswordRequest
{
    [Required, MinLength(8)]
    public string NewPassword { get; set; } = string.Empty;
}
