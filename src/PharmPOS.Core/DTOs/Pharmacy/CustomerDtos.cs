namespace PharmPOS.Core.DTOs.Pharmacy;

public class CustomerResponse
{
    public Guid    CustomerId { get; set; }
    public string  Name       { get; set; } = string.Empty;
    public string? Phone      { get; set; }
    public string? Email      { get; set; }
    public string? Notes      { get; set; }
    public bool    IsActive   { get; set; }
}

public class SaveCustomerRequest
{
    public string  Name   { get; set; } = string.Empty;
    public string? Phone  { get; set; }
    public string? Email  { get; set; }
    public string? Notes  { get; set; }
}
