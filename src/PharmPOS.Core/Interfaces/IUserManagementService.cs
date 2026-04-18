using PharmPOS.Core.DTOs.Users;

namespace PharmPOS.Core.Interfaces;

public interface IUserManagementService
{
    Task<List<UserResponse>> GetAllAsync(bool includeInactive = false, string? role = null, CancellationToken ct = default);
    Task<UserResponse> GetByIdAsync(Guid userId, CancellationToken ct = default);
    Task<UserResponse> CreateAsync(CreateUserRequest request, CancellationToken ct = default);
    Task<UserResponse> UpdateAsync(Guid userId, UpdateUserRequest request, CancellationToken ct = default);
    Task DeactivateAsync(Guid userId, CancellationToken ct = default);
    Task ReactivateAsync(Guid userId, CancellationToken ct = default);
    Task ResetPasswordAsync(Guid userId, ResetPasswordRequest request, CancellationToken ct = default);
    Task<List<DepartmentSummary>> GetDepartmentsAsync(CancellationToken ct = default);
    Task RenameDepartmentAsync(RenameDepartmentRequest request, CancellationToken ct = default);
}
