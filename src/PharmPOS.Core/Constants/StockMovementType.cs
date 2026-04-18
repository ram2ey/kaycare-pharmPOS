namespace PharmPOS.Core.Constants;

public static class StockMovementType
{
    public const string Receive      = "Receive";      // + stock: goods received from supplier / purchase order
    public const string Dispense     = "Dispense";     // - stock: dispensed via prescription
    public const string Sale         = "Sale";         // - stock: sold via POS
    public const string AdjustAdd   = "AdjustAdd";    // + stock: manual correction (found extra stock, return from ward)
    public const string AdjustDeduct = "AdjustDeduct"; // - stock: manual correction (damaged, lost, reconciliation)
    public const string Return       = "Return";       // + stock: patient returns unused medication
    public const string Expire       = "Expire";       // - stock: expired stock removed
    public const string WriteOff     = "WriteOff";     // - stock: damaged / disposed

    /// <summary>Movement types that increase CurrentStock.</summary>
    public static readonly IReadOnlySet<string> IsAdditive = new HashSet<string>
        { Receive, AdjustAdd, Return };

    /// <summary>Movement types that decrease CurrentStock.</summary>
    public static readonly IReadOnlySet<string> IsDeductive = new HashSet<string>
        { Dispense, Sale, AdjustDeduct, Expire, WriteOff };

    public static readonly string[] All =
        [Receive, Dispense, Sale, AdjustAdd, AdjustDeduct, Return, Expire, WriteOff];
}
