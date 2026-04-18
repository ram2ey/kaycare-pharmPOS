namespace PharmPOS.Core.Entities;

public class PurchaseOrderItem
{
    public Guid    PurchaseOrderItemId { get; set; }
    public Guid    TenantId            { get; set; }
    public Guid    PurchaseOrderId     { get; set; }
    public Guid    DrugInventoryId     { get; set; }
    public int     Quantity            { get; set; }       // ordered quantity
    public int     QuantityReceived    { get; set; }       // cumulative received to date
    public decimal UnitCost            { get; set; }

    public PurchaseOrder  PurchaseOrder  { get; set; } = null!;
    public DrugInventory  DrugInventory  { get; set; } = null!;
}
