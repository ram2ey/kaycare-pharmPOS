using PharmPOS.Core.DTOs.Pharmacy;

namespace PharmPOS.Core.Interfaces;

public interface ISaleService
{
    Task<List<SaleSummaryResponse>> GetAllAsync(DateOnly? from, DateOnly? to, CancellationToken ct);
    Task<SaleDetailResponse> GetByIdAsync(Guid saleId, CancellationToken ct);
    Task<SaleDetailResponse> CreateAsync(CreateSaleRequest request, CancellationToken ct);
    Task<SaleDetailResponse> VoidAsync(Guid saleId, VoidSaleRequest request, CancellationToken ct);
    Task<DailySalesSummaryResponse> GetDailySummaryAsync(DateOnly date, CancellationToken ct);
}
