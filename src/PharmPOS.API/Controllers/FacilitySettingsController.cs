using PharmPOS.Core.Constants;
using PharmPOS.Core.DTOs.Facility;
using PharmPOS.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace PharmPOS.API.Controllers;

[ApiController]
[Route("api/facility-settings")]
[Authorize]
public class FacilitySettingsController : ControllerBase
{
    private readonly IFacilitySettingsService _settings;

    public FacilitySettingsController(IFacilitySettingsService settings)
    {
        _settings = settings;
    }

    /// <summary>Get the current facility settings. Returns 404 if not yet configured.</summary>
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var result = await _settings.GetAsync(ct);
        return result == null ? NotFound() : Ok(result);
    }

    /// <summary>Create or update facility settings (Admin/SuperAdmin).</summary>
    [HttpPut]
    [Authorize(Roles = $"{Roles.Admin},{Roles.SuperAdmin}")]
    public async Task<IActionResult> Upsert([FromBody] SaveFacilitySettingsRequest request, CancellationToken ct)
        => Ok(await _settings.UpsertAsync(request, ct));

    /// <summary>Upload a facility logo (PNG/JPEG, max 2 MB). Admin/SuperAdmin only.</summary>
    [HttpPost("logo")]
    [Authorize(Roles = $"{Roles.Admin},{Roles.SuperAdmin}")]
    public async Task<IActionResult> UploadLogo(IFormFile file, CancellationToken ct)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { error = "No file provided." });

        if (file.Length > 2 * 1024 * 1024)
            return BadRequest(new { error = "Logo must be 2 MB or smaller." });

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext is not (".png" or ".jpg" or ".jpeg"))
            return BadRequest(new { error = "Only PNG and JPEG files are accepted." });

        var contentType = ext == ".png" ? "image/png" : "image/jpeg";

        await using var stream = file.OpenReadStream();
        var result = await _settings.UploadLogoAsync(stream, contentType, ext, ct);
        return Ok(result);
    }

    /// <summary>Delete the current facility logo (Admin/SuperAdmin).</summary>
    [HttpDelete("logo")]
    [Authorize(Roles = $"{Roles.Admin},{Roles.SuperAdmin}")]
    public async Task<IActionResult> DeleteLogo(CancellationToken ct)
        => Ok(await _settings.DeleteLogoAsync(ct));
}
