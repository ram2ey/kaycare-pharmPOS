namespace PharmPOS.Core.DTOs.Pharmacy;

public class StockMovementResponse
{
    public Guid     StockMovementId { get; set; }
    public Guid     DrugInventoryId { get; set; }
    public string   DrugName        { get; set; } = string.Empty;
    public string   MovementType    { get; set; } = string.Empty;
    public int      Quantity        { get; set; }
    public int      PreviousStock   { get; set; }
    public int      NewStock        { get; set; }
    public Guid?    ReferenceId     { get; set; }
    public string?  ReferenceType   { get; set; }
    public string?  Notes           { get; set; }
    public string   CreatedByName   { get; set; } = string.Empty;
    public DateTime CreatedAt       { get; set; }
}
