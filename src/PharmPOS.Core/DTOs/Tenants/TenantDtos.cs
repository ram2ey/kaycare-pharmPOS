namespace PharmPOS.Core.DTOs.Tenants;

public class TenantResponse
{
    public Guid   TenantId         { get; set; }
    public string TenantCode       { get; set; } = string.Empty;
    public string TenantName       { get; set; } = string.Empty;
    public string Subdomain        { get; set; } = string.Empty;
    public string TenantType       { get; set; } = string.Empty;
    public string SubscriptionPlan { get; set; } = string.Empty;
    public bool   IsActive         { get; set; }
    public int    MaxUsers         { get; set; }
    public int    StorageQuotaGB   { get; set; }
    public int    UserCount        { get; set; }
    public DateTime CreatedAt      { get; set; }
}

public class CreateTenantRequest
{
    public string TenantCode       { get; set; } = string.Empty;
    public string TenantName       { get; set; } = string.Empty;
    public string TenantType       { get; set; } = Constants.TenantType.PharmOS;
    public string SubscriptionPlan { get; set; } = "Standard";
    public int    MaxUsers         { get; set; } = 50;
    public int    StorageQuotaGB   { get; set; } = 100;

    // First admin user credentials
    public string AdminEmail       { get; set; } = string.Empty;
    public string AdminFirstName   { get; set; } = string.Empty;
    public string AdminLastName    { get; set; } = string.Empty;
}

public class UpdateTenantRequest
{
    public string TenantName       { get; set; } = string.Empty;
    public string TenantType       { get; set; } = string.Empty;
    public string SubscriptionPlan { get; set; } = string.Empty;
    public int    MaxUsers         { get; set; }
    public int    StorageQuotaGB   { get; set; }
}
