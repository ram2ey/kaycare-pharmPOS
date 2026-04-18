namespace PharmPOS.Core.Entities;

public class Sale : TenantEntity
{
    public Guid     SaleId         { get; set; }
    public string   SaleNumber     { get; set; } = string.Empty;   // SAL-YYYY-NNNNN
    public Guid?    CustomerId     { get; set; }
    public string   CustomerName   { get; set; } = "Walk-in";      // snapshot at time of sale
    public string   PaymentMethod  { get; set; } = string.Empty;
    public decimal  TotalAmount    { get; set; }
    public decimal  DiscountAmount { get; set; }
    public decimal  PaidAmount     { get; set; }
    public decimal  Change         { get; set; }
    public string?  Notes          { get; set; }
    public bool     IsVoided       { get; set; }
    public string?  VoidReason     { get; set; }
    public Guid     SoldByUserId   { get; set; }
    public DateTime SaleDate       { get; set; }

    public Customer?        Customer  { get; set; }
    public User             SoldBy    { get; set; } = null!;
    public ICollection<SaleItem> Items { get; set; } = [];
}

public class SaleItem
{
    public Guid     SaleItemId      { get; set; }
    public Guid     TenantId        { get; set; }
    public Guid     SaleId          { get; set; }
    public Guid?    DrugInventoryId { get; set; }   // nullable — drug may be deleted later
    public string   DrugName        { get; set; } = string.Empty;  // snapshot
    public string?  DosageForm      { get; set; }
    public string?  Strength        { get; set; }
    public int      Quantity        { get; set; }
    public decimal  UnitPrice       { get; set; }
    public decimal  TotalPrice      { get; set; }

    public Sale          Sale  { get; set; } = null!;
    public DrugInventory? Drug { get; set; }
}
