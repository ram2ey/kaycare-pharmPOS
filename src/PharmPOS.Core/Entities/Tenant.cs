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
    public bool IsAiEnabled { get; set; } = true;
    public int AiMonthlyQuota { get; set; } = 500;
    public int AiRequestsThisMonth { get; set; } = 0;
    public DateTime AiQuotaResetDate { get; set; } = DateTime.UtcNow;
    public string? CustomOpenRouterKey { get; set; }
    public string AllowedAiTiers { get; set; } = "Standard";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
