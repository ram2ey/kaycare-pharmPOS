using PharmPOS.Core.DTOs.Pharmacy;

namespace PharmPOS.Core.Interfaces;

public interface IDrugInventoryService
{
    Task<List<DrugInventoryResponse>> GetAllAsync(bool? activeOnly, bool? lowStockOnly, string? category, CancellationToken ct = default);
    Task<DrugInventoryResponse?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<DrugInventoryResponse> CreateAsync(SaveDrugRequest request, CancellationToken ct = default);
    Task<DrugInventoryResponse> UpdateAsync(Guid id, SaveDrugRequest request, CancellationToken ct = default);
    Task<DrugInventoryResponse> DeactivateAsync(Guid id, CancellationToken ct = default);
    Task<List<ReorderAlertResponse>> GetReorderAlertsAsync(CancellationToken ct = default);
}
