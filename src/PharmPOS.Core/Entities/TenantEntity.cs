namespace PharmPOS.Core.Entities;

public abstract class TenantEntity
{
    public Guid TenantId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
