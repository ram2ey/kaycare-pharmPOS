namespace PharmPOS.Core.Constants;

public static class PaymentMethod
{
    public const string Cash        = "Cash";
    public const string Card        = "Card";
    public const string MobileMoney = "MobileMoney";
    public const string Insurance   = "Insurance";

    public static readonly string[] All = [Cash, Card, MobileMoney, Insurance];
}
