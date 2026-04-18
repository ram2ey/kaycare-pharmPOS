namespace PharmPOS.Core.Entities;

public class StockMovement
{
    public Guid     StockMovementId { get; set; }
    public Guid     TenantId        { get; set; }
    public Guid     DrugInventoryId { get; set; }
    public string   MovementType    { get; set; } = string.Empty;
    public int      Quantity        { get; set; }      // always positive; direction encoded in MovementType
    public int      PreviousStock   { get; set; }
    public int      NewStock        { get; set; }
    public Guid?    ReferenceId     { get; set; }      // e.g. SaleId
    public string?  ReferenceType   { get; set; }      // e.g. "Sale"
    public string?  Notes           { get; set; }
    public Guid     CreatedByUserId { get; set; }
    public DateTime CreatedAt       { get; set; }

    public DrugInventory DrugInventory { get; set; } = null!;
    public User          CreatedBy     { get; set; } = null!;
}
