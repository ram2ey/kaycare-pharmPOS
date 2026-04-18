namespace PharmPOS.Core.Entities;

public class Tenant
{
    public Guid TenantId { get; set; }
    public string TenantCode { get; set; } = string.Empty;
    public string TenantName { get; set; } = string.Empty;
    public string Subdomain { get; set; } = string.Empty;
    public string SubscriptionPlan { get; set; } = "standard";
    public string TenantType { get; set; } = Constants.TenantType.PharmOS;
    public bool IsActive { get; set; } = true;
    public int MaxUsers { get; set; } = 50;
    public int StorageQuotaGB { get; set; } = 100;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
