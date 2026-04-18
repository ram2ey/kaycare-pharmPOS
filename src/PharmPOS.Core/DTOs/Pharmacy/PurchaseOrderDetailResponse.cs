namespace PharmPOS.Core.DTOs.Pharmacy;

public class PurchaseOrderDetailResponse
{
    public Guid      PurchaseOrderId      { get; set; }
    public string    OrderNumber          { get; set; } = string.Empty;
    public Guid?     SupplierId           { get; set; }
    public string?   SupplierName         { get; set; }
    public string?   SupplierPhone        { get; set; }
    public string?   SupplierEmail        { get; set; }
    public string    Status               { get; set; } = string.Empty;
    public DateTime  OrderDate            { get; set; }
    public DateTime? ExpectedDeliveryDate { get; set; }
    public string?   Notes                { get; set; }
    public decimal   TotalAmount          { get; set; }
    public DateTime  CreatedAt            { get; set; }
    public DateTime  UpdatedAt            { get; set; }

    public List<PurchaseOrderItemResponse> Items { get; set; } = [];
}

public class PurchaseOrderItemResponse
{
    public Guid    PurchaseOrderItemId { get; set; }
    public Guid    DrugInventoryId     { get; set; }
    public string  DrugName            { get; set; } = string.Empty;
    public string? DosageForm          { get; set; }
    public string? Strength            { get; set; }
    public string  Unit                { get; set; } = string.Empty;
    public int     Quantity            { get; set; }
    public int     QuantityReceived    { get; set; }
    public int     QuantityPending     { get; set; }
    public decimal UnitCost            { get; set; }
    public decimal TotalCost           { get; set; }
    public bool    IsFullyReceived     { get; set; }
}
