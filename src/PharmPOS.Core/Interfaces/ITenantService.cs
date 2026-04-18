using PharmPOS.Core.DTOs.Tenants;

namespace PharmPOS.Core.Interfaces;

public interface ITenantService
{
    Task<List<TenantResponse>> GetAllAsync(CancellationToken ct = default);
    Task<TenantResponse?>      GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<TenantResponse>       CreateAsync(CreateTenantRequest req, CancellationToken ct = default);
    Task<TenantResponse>       UpdateAsync(Guid id, UpdateTenantRequest req, CancellationToken ct = default);
    Task<TenantResponse>       SetActiveAsync(Guid id, bool isActive, CancellationToken ct = default);
}
