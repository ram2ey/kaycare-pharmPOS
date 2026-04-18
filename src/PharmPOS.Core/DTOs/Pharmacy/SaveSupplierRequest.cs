namespace PharmPOS.Core.DTOs.Pharmacy;

public class SaveSupplierRequest
{
    public string  Name        { get; set; } = string.Empty;
    public string? ContactName { get; set; }
    public string? Phone       { get; set; }
    public string? Email       { get; set; }
    public string? Address     { get; set; }
    public string? Notes       { get; set; }
    public bool    IsActive    { get; set; } = true;
}
