using PharmPOS.Core.DTOs.Pharmacy;

namespace PharmPOS.Core.Interfaces;

public interface ICSRegisterService
{
    Task<List<CSRegisterDrugEntry>> GetRegisterAsync(DateOnly? from = null, DateOnly? to = null, CancellationToken ct = default);
}
