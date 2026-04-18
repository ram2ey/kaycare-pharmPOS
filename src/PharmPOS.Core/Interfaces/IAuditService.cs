namespace PharmPOS.Core.Interfaces;

public interface IAuditService
{
    Task LogAsync(
        string  action,
        string  entityType,
        Guid    entityId,
        Guid?   patientId,
        string? details     = null,
        CancellationToken ct = default);
}
