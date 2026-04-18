namespace PharmPOS.Core.DTOs.Pharmacy;

public class ReorderAlertResponse
{
    public Guid    DrugInventoryId  { get; set; }
    public string  Name             { get; set; } = string.Empty;
    public string? GenericName      { get; set; }
    public string? DosageForm       { get; set; }
    public string? Strength         { get; set; }
    public string? Category         { get; set; }
    public int     CurrentStock     { get; set; }
    public int     ReorderThreshold { get; set; }
    public int     Deficit          { get; set; }  // ReorderThreshold - CurrentStock
}
