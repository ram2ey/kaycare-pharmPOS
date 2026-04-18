namespace PharmPOS.Core.DTOs.Users;

public class RenameDepartmentRequest
{
    public string OldName { get; set; } = string.Empty;
    public string NewName { get; set; } = string.Empty;
}
