using PharmPOS.Core.DTOs.Pharmacy;

namespace PharmPOS.Core.Interfaces;

public interface ICustomerService
{
    Task<List<CustomerResponse>> GetAllAsync(string? search, CancellationToken ct);
    Task<CustomerResponse> GetByIdAsync(Guid customerId, CancellationToken ct);
    Task<CustomerResponse> CreateAsync(SaveCustomerRequest request, CancellationToken ct);
    Task<CustomerResponse> UpdateAsync(Guid customerId, SaveCustomerRequest request, CancellationToken ct);
    Task DeactivateAsync(Guid customerId, CancellationToken ct);
}
