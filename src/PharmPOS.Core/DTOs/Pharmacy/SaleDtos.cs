namespace PharmPOS.Core.DTOs.Pharmacy;

public class SaleSummaryResponse
{
    public Guid     SaleId        { get; set; }
    public string   SaleNumber    { get; set; } = string.Empty;
    public string   CustomerName  { get; set; } = string.Empty;
    public string   PaymentMethod { get; set; } = string.Empty;
    public decimal  TotalAmount   { get; set; }
    public decimal  PaidAmount    { get; set; }
    public bool     IsVoided      { get; set; }
    public string   SoldByName    { get; set; } = string.Empty;
    public DateTime SaleDate      { get; set; }
    public int      ItemCount     { get; set; }
}

public class SaleDetailResponse
{
    public Guid     SaleId         { get; set; }
    public string   SaleNumber     { get; set; } = string.Empty;
    public Guid?    CustomerId     { get; set; }
    public string   CustomerName   { get; set; } = string.Empty;
    public string   PaymentMethod  { get; set; } = string.Empty;
    public decimal  TotalAmount    { get; set; }
    public decimal  DiscountAmount { get; set; }
    public decimal  PaidAmount     { get; set; }
    public decimal  Change         { get; set; }
    public string?  Notes          { get; set; }
    public bool     IsVoided       { get; set; }
    public string?  VoidReason     { get; set; }
    public string   SoldByName     { get; set; } = string.Empty;
    public DateTime SaleDate       { get; set; }
    public List<SaleItemResponse> Items { get; set; } = [];
}

public class SaleItemResponse
{
    public Guid    SaleItemId      { get; set; }
    public Guid?   DrugInventoryId { get; set; }
    public string  DrugName        { get; set; } = string.Empty;
    public string? DosageForm      { get; set; }
    public string? Strength        { get; set; }
    public int     Quantity        { get; set; }
    public decimal UnitPrice       { get; set; }
    public decimal TotalPrice      { get; set; }
}

public class CreateSaleRequest
{
    public Guid?   CustomerId     { get; set; }
    public string? CustomerName   { get; set; }
    public string  PaymentMethod  { get; set; } = string.Empty;
    public decimal PaidAmount     { get; set; }
    public decimal DiscountAmount { get; set; }
    public string? Notes          { get; set; }
    public List<CreateSaleItemRequest> Items { get; set; } = [];
}

public class CreateSaleItemRequest
{
    public Guid    DrugInventoryId { get; set; }
    public int     Quantity        { get; set; }
}

public class VoidSaleRequest
{
    public string Reason { get; set; } = string.Empty;
}

public class DailySalesSummaryResponse
{
    public DateOnly   Date         { get; set; }
    public int        TotalSales   { get; set; }
    public decimal    TotalRevenue { get; set; }
    public decimal    CashRevenue  { get; set; }
    public decimal    CardRevenue  { get; set; }
    public decimal    MobileMoneyRevenue { get; set; }
    public decimal    InsuranceRevenue   { get; set; }
    public List<TopDrugResponse> TopDrugs { get; set; } = [];
}

public class TopDrugResponse
{
    public string DrugName      { get; set; } = string.Empty;
    public int    TotalQuantity { get; set; }
    public decimal TotalRevenue { get; set; }
}
