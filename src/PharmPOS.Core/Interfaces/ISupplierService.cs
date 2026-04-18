using PharmPOS.Core.DTOs.Pharmacy;

namespace PharmPOS.Core.Interfaces;

public interface ISupplierService
{
    Task<List<SupplierResponse>> GetAllAsync(bool? activeOnly = null, CancellationToken ct = default);
    Task<SupplierResponse?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<SupplierResponse> CreateAsync(SaveSupplierRequest request, CancellationToken ct = default);
    Task<SupplierResponse> UpdateAsync(Guid id, SaveSupplierRequest request, CancellationToken ct = default);
    Task<SupplierResponse> DeactivateAsync(Guid id, CancellationToken ct = default);
}
