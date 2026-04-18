namespace PharmPOS.Core.DTOs.Pharmacy;

public class SaveDrugRequest
{
    public string  Name                  { get; set; } = string.Empty;
    public string? GenericName           { get; set; }
    public string? DosageForm            { get; set; }
    public string? Strength              { get; set; }
    public string  Unit                  { get; set; } = "Tablet";
    public string? Category              { get; set; }
    public int     ReorderThreshold      { get; set; }
    public decimal UnitCost              { get; set; }
    public decimal SellingPrice          { get; set; }
    public bool    IsControlledSubstance { get; set; }
    public bool    IsActive              { get; set; } = true;
}
