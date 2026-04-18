namespace PharmPOS.Core.Entities;

/// <summary>
/// Immutable audit record. Never updated, never deleted.
/// BIGINT IDENTITY PK for high-volume write performance.
/// TenantId and UserId are stored as plain Guids — no FK constraints —
/// so audit records survive tenant or user deletion.
/// </summary>
public class AuditLog
{
    public long    AuditLogId { get; set; }   // BIGINT IDENTITY
    public Guid    TenantId   { get; set; }
    public Guid    UserId     { get; set; }
    public string  UserEmail  { get; set; } = string.Empty;  // denormalized
    public string  Action     { get; set; } = string.Empty;  // e.g. Sale.Create
    public string  EntityType { get; set; } = string.Empty;  // e.g. Sale
    public Guid    EntityId   { get; set; }
    public Guid?   PatientId  { get; set; }   // unused in PharmPOS, kept for schema compat
    public string? Details    { get; set; }
    public string? IpAddress  { get; set; }
    public DateTime Timestamp { get; set; }
}
