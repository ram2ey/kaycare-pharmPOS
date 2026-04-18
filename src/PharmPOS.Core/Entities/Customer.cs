namespace PharmPOS.Core.Entities;

public class Customer : TenantEntity
{
    public Guid    CustomerId { get; set; }
    public string  Name       { get; set; } = string.Empty;
    public string? Phone      { get; set; }
    public string? Email      { get; set; }
    public string? Notes      { get; set; }
    public bool    IsActive   { get; set; } = true;

    public ICollection<Sale> Sales { get; set; } = [];
}
