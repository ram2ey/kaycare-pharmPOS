using PharmPOS.Core.DTOs.Pharmacy;

namespace PharmPOS.Core.Interfaces;

public interface IStockMovementService
{
    Task<StockMovementResponse> RecordMovementAsync(Guid drugInventoryId, string movementType, int quantity, Guid? referenceId = null, string? referenceType = null, string? notes = null, CancellationToken ct = default);
    Task<List<StockMovementResponse>> GetMovementsForDrugAsync(Guid drugInventoryId, CancellationToken ct = default);
}
