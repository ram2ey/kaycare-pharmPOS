namespace PharmPOS.Core.DTOs.Pharmacy;

public class CSRegisterDrugEntry
{
    public Guid    DrugInventoryId { get; set; }
    public string  DrugName        { get; set; } = string.Empty;
    public string? GenericName     { get; set; }
    public string? DosageForm      { get; set; }
    public string? Strength        { get; set; }
    public int     CurrentStock    { get; set; }
    public List<CSRegisterMovement> Movements { get; set; } = [];
}

public class CSRegisterMovement
{
    public Guid     StockMovementId { get; set; }
    public DateTime Date            { get; set; }
    public string   MovementType    { get; set; } = string.Empty;
    public int?     QuantityIn      { get; set; }
    public int?     QuantityOut     { get; set; }
    public int      Balance         { get; set; }
    public string?  ReferenceType   { get; set; }
    public string?  Notes           { get; set; }
    public string   RecordedBy      { get; set; } = string.Empty;
}
