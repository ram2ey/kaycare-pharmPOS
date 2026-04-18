namespace PharmPOS.Core.Entities;

public class DrugInventory : TenantEntity
{
    public Guid    DrugInventoryId       { get; set; }
    public string  Name                  { get; set; } = string.Empty;
    public string? GenericName           { get; set; }
    public string? DosageForm            { get; set; }
    public string? Strength              { get; set; }
    public string  Unit                  { get; set; } = "Tablet";
    public string? Category              { get; set; }
    public int     CurrentStock          { get; set; }
    public int     ReorderThreshold      { get; set; }
    public decimal UnitCost              { get; set; }
    public decimal SellingPrice          { get; set; }
    public bool    IsControlledSubstance { get; set; }
    public bool    IsActive              { get; set; } = true;

    public ICollection<StockMovement> StockMovements { get; set; } = [];
}
