namespace PharmPOS.Core.DTOs.Audit;

public class AuditLogQueryRequest
{
    public Guid?     PatientId { get; set; }
    public Guid?     UserId    { get; set; }
    public string?   Action    { get; set; }
    public DateTime? From      { get; set; }
    public DateTime? To        { get; set; }
    public int       Page      { get; set; } = 1;
    public int       PageSize  { get; set; } = 50;
}
