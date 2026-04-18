namespace PharmPOS.Core.DTOs.Pharmacy;

public class SavePurchaseOrderRequest
{
    public Guid?     SupplierId           { get; set; }
    public DateTime? ExpectedDeliveryDate { get; set; }
    public string?   Notes                { get; set; }
    public List<SavePurchaseOrderItemRequest> Items { get; set; } = [];
}

public class SavePurchaseOrderItemRequest
{
    public Guid    DrugInventoryId { get; set; }
    public int     Quantity        { get; set; }
    public decimal UnitCost        { get; set; }
}
