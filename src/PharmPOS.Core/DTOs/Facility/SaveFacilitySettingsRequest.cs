namespace PharmPOS.Core.DTOs.Facility;

public class SaveFacilitySettingsRequest
{
    public string  FacilityName { get; set; } = string.Empty;
    public string? Address      { get; set; }
    public string? Phone        { get; set; }
    public string? Email        { get; set; }
}
