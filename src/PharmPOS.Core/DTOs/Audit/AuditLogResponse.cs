namespace PharmPOS.Core.DTOs.Audit;

public class AuditLogResponse
{
    public long     AuditLogId { get; set; }
    public Guid     TenantId   { get; set; }
    public Guid     UserId     { get; set; }
    public string   UserEmail  { get; set; } = string.Empty;
    public string   Action     { get; set; } = string.Empty;
    public string   EntityType { get; set; } = string.Empty;
    public Guid     EntityId   { get; set; }
    public Guid?    PatientId  { get; set; }
    public string?  Details    { get; set; }
    public string?  IpAddress  { get; set; }
    public DateTime Timestamp  { get; set; }
}
