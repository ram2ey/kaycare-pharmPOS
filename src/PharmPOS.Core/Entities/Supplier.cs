namespace PharmPOS.Core.Entities;

public class Supplier : TenantEntity
{
    public Guid    SupplierId   { get; set; }
    public string  Name         { get; set; } = string.Empty;
    public string? ContactName  { get; set; }
    public string? Phone        { get; set; }
    public string? Email        { get; set; }
    public string? Address      { get; set; }
    public string? Notes        { get; set; }
    public bool    IsActive     { get; set; } = true;

    public ICollection<PurchaseOrder> PurchaseOrders { get; set; } = [];
}
