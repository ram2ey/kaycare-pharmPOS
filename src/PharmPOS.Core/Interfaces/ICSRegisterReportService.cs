using PharmPOS.Core.DTOs.Pharmacy;

namespace PharmPOS.Core.Interfaces;

public interface ICSRegisterReportService
{
    Task<byte[]> GenerateAsync(List<CSRegisterDrugEntry> entries, DateOnly? from, DateOnly? to, CancellationToken ct);
}
