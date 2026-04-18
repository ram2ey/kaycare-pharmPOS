namespace PharmPOS.Core.DTOs.Pharmacy;

public class RecordMovementRequest
{
    public string  MovementType { get; set; } = string.Empty;
    public int     Quantity     { get; set; }
    public string? Notes        { get; set; }
}
