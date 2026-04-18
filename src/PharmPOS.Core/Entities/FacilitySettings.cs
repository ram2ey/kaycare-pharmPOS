namespace PharmPOS.Core.Entities;

public class FacilitySettings : TenantEntity
{
    public Guid    FacilitySettingsId { get; set; }
    public string  FacilityName       { get; set; } = string.Empty;
    public string? Address            { get; set; }
    public string? Phone              { get; set; }
    public string? Email              { get; set; }
    /// <summary>Blob name within the tenant container, e.g. "facility-logo.png". Null when no logo uploaded.</summary>
    public string? LogoBlobName       { get; set; }
}
