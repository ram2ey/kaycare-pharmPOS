namespace PharmPOS.Core.Entities;

public class PurchaseOrder : TenantEntity
{
    public Guid      PurchaseOrderId      { get; set; }
    public string    OrderNumber          { get; set; } = string.Empty;
    public Guid?     SupplierId           { get; set; }
    public string    Status               { get; set; } = "Draft";
    public DateTime  OrderDate            { get; set; }
    public DateTime? ExpectedDeliveryDate { get; set; }
    public string?   Notes                { get; set; }

    public Supplier?                      Supplier { get; set; }
    public ICollection<PurchaseOrderItem> Items    { get; set; } = [];
}
