using PharmPOS.Core.DTOs.Facility;
using PharmPOS.Core.Entities;
using PharmPOS.Core.Interfaces;
using PharmPOS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace PharmPOS.Infrastructure.Services;

public class FacilitySettingsService : IFacilitySettingsService
{
    private static readonly TimeSpan LogoSasExpiry = TimeSpan.FromMinutes(30);
    private const  string            LogoBlobPrefix = "facility-logo";

    private readonly AppDbContext        _db;
    private readonly ITenantContext      _tenantContext;
    private readonly IBlobStorageService _blob;

    public FacilitySettingsService(AppDbContext db, ITenantContext tenantContext, IBlobStorageService blob)
    {
        _db            = db;
        _tenantContext = tenantContext;
        _blob          = blob;
    }

    public async Task<FacilitySettingsResponse?> GetAsync(CancellationToken ct = default)
    {
        var settings = await _db.FacilitySettings
            .AsNoTracking()
            .FirstOrDefaultAsync(ct);

        return settings == null ? null : Map(settings);
    }

    public async Task<FacilitySettingsResponse> UpsertAsync(SaveFacilitySettingsRequest request, CancellationToken ct = default)
    {
        var settings = await _db.FacilitySettings.FirstOrDefaultAsync(ct);

        if (settings == null)
        {
            settings = new FacilitySettings
            {
                FacilitySettingsId = Guid.NewGuid(),
                FacilityName       = request.FacilityName.Trim(),
                Address            = request.Address?.Trim(),
                Phone              = request.Phone?.Trim(),
                Email              = request.Email?.Trim(),
            };
            _db.FacilitySettings.Add(settings);
        }
        else
        {
            settings.FacilityName = request.FacilityName.Trim();
            settings.Address      = request.Address?.Trim();
            settings.Phone        = request.Phone?.Trim();
            settings.Email        = request.Email?.Trim();
        }

        await _db.SaveChangesAsync(ct);
        return Map(settings);
    }

    public async Task<FacilitySettingsResponse> UploadLogoAsync(
        Stream stream, string contentType, string extension, CancellationToken ct = default)
    {
        var settings = await EnsureSettingsAsync(ct);

        // Delete old logo if exists
        if (!string.IsNullOrEmpty(settings.LogoBlobName))
            await _blob.DeleteAsync(ContainerName(), settings.LogoBlobName, ct);

        var blobName = $"{LogoBlobPrefix}{extension.ToLowerInvariant()}";
        await _blob.UploadAsync(ContainerName(), blobName, stream, contentType, ct);

        settings.LogoBlobName = blobName;
        await _db.SaveChangesAsync(ct);

        return Map(settings);
    }

    public async Task<FacilitySettingsResponse> DeleteLogoAsync(CancellationToken ct = default)
    {
        var settings = await EnsureSettingsAsync(ct);

        if (!string.IsNullOrEmpty(settings.LogoBlobName))
        {
            await _blob.DeleteAsync(ContainerName(), settings.LogoBlobName, ct);
            settings.LogoBlobName = null;
            await _db.SaveChangesAsync(ct);
        }

        return Map(settings);
    }

    public async Task<byte[]?> GetLogoBytesAsync(CancellationToken ct = default)
    {
        var settings = await _db.FacilitySettings
            .AsNoTracking()
            .FirstOrDefaultAsync(ct);

        if (settings == null || string.IsNullOrEmpty(settings.LogoBlobName))
            return null;

        return await _blob.DownloadAsync(ContainerName(), settings.LogoBlobName, ct);
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private async Task<FacilitySettings> EnsureSettingsAsync(CancellationToken ct)
    {
        var settings = await _db.FacilitySettings.FirstOrDefaultAsync(ct);
        if (settings != null) return settings;

        // Auto-create with default name if none exists yet
        settings = new FacilitySettings
        {
            FacilitySettingsId = Guid.NewGuid(),
            FacilityName       = _tenantContext.TenantCode,
        };
        _db.FacilitySettings.Add(settings);
        await _db.SaveChangesAsync(ct);
        return settings;
    }

    private string ContainerName()
    {
        var sanitized = new string(
            _tenantContext.TenantCode.ToLower()
                .Select(c => char.IsLetterOrDigit(c) ? c : '-')
                .ToArray());

        while (sanitized.Contains("--"))
            sanitized = sanitized.Replace("--", "-");
        sanitized = sanitized.Trim('-');

        return $"tenant-{sanitized}";
    }

    private FacilitySettingsResponse Map(FacilitySettings s) => new()
    {
        FacilitySettingsId = s.FacilitySettingsId,
        FacilityName       = s.FacilityName,
        Address            = s.Address,
        Phone              = s.Phone,
        Email              = s.Email,
        HasLogo            = !string.IsNullOrEmpty(s.LogoBlobName),
        LogoUrl            = string.IsNullOrEmpty(s.LogoBlobName)
            ? null
            : _blob.GenerateSasUri(ContainerName(), s.LogoBlobName, LogoSasExpiry).ToString(),
        UpdatedAt          = s.UpdatedAt,
    };
}
