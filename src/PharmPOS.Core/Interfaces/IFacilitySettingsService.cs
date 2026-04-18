using PharmPOS.Core.DTOs.Facility;

namespace PharmPOS.Core.Interfaces;

public interface IFacilitySettingsService
{
    Task<FacilitySettingsResponse?> GetAsync(CancellationToken ct = default);
    Task<FacilitySettingsResponse>  UpsertAsync(SaveFacilitySettingsRequest request, CancellationToken ct = default);
    Task<FacilitySettingsResponse>  UploadLogoAsync(Stream stream, string contentType, string extension, CancellationToken ct = default);
    Task<FacilitySettingsResponse>  DeleteLogoAsync(CancellationToken ct = default);
    /// <summary>Returns raw logo bytes for embedding in PDFs. Returns null if no logo is set.</summary>
    Task<byte[]?>                   GetLogoBytesAsync(CancellationToken ct = default);
}
