namespace PharmPOS.Core.Constants;

public static class PurchaseOrderStatus
{
    public const string Draft              = "Draft";
    public const string Ordered            = "Ordered";
    public const string PartiallyReceived  = "PartiallyReceived";
    public const string Received           = "Received";
    public const string Cancelled          = "Cancelled";

    public static readonly string[] All =
        [Draft, Ordered, PartiallyReceived, Received, Cancelled];
}
