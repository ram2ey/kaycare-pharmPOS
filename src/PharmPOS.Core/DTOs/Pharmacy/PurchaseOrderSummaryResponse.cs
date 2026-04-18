namespace PharmPOS.Core.DTOs.Pharmacy;

public class PurchaseOrderSummaryResponse
{
    public Guid      PurchaseOrderId      { get; set; }
    public string    OrderNumber          { get; set; } = string.Empty;
    public Guid?     SupplierId           { get; set; }
    public string?   SupplierName         { get; set; }
    public string    Status               { get; set; } = string.Empty;
    public DateTime  OrderDate            { get; set; }
    public DateTime? ExpectedDeliveryDate { get; set; }
    public int       ItemCount            { get; set; }
    public decimal   TotalAmount          { get; set; }
    public DateTime  CreatedAt            { get; set; }
}
