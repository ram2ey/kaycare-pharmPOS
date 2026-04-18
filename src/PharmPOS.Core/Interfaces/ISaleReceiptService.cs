namespace PharmPOS.Core.Interfaces;

public interface ISaleReceiptService
{
    /// <summary>Generates an A5 receipt PDF for the sale. Returns null if not found.</summary>
    Task<byte[]?> GenerateReceiptAsync(Guid saleId, CancellationToken ct);
}
