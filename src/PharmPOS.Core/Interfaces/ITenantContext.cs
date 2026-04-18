namespace PharmPOS.Core.Interfaces;

public interface ITenantContext
{
    Guid TenantId { get; set; }
    string TenantCode { get; set; }
}
