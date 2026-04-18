namespace PharmPOS.Core.DTOs.Pharmacy;

public class DrugInventoryResponse
{
    public Guid     DrugInventoryId       { get; set; }
    public string   Name                  { get; set; } = string.Empty;
    public string?  GenericName           { get; set; }
    public string?  DosageForm            { get; set; }
    public string?  Strength              { get; set; }
    public string   Unit                  { get; set; } = string.Empty;
    public string?  Category              { get; set; }
    public int      CurrentStock          { get; set; }
    public int      ReorderThreshold      { get; set; }
    public bool     IsLowStock            { get; set; }
    public decimal  UnitCost              { get; set; }
    public decimal  SellingPrice          { get; set; }
    public bool     IsControlledSubstance { get; set; }
    public bool     IsActive              { get; set; }
    public DateTime CreatedAt             { get; set; }
    public DateTime UpdatedAt             { get; set; }
}
