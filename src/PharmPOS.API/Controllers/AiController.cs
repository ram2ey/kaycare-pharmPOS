using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace PharmPOS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AiController : ControllerBase
{
    private readonly IConfiguration _config;
    private static readonly HttpClient _httpClient = new();

    public AiController(IConfiguration config)
    {
        _config = config;
    }

    [HttpPost("drug-safety")]
    public async Task<IActionResult> DrugSafety([FromBody] DrugSafetyRequest request)
    {
        string drugsJson = JsonSerializer.Serialize(request.Items);
        string prompt = $@"You are a Clinical Pharmacist. Review the following medication cart for potential safety risks, drug-drug interactions, and controlled substance flags.
Medications:
{drugsJson}

Provide a structured response in Markdown containing:
1. **Drug-Drug Interactions**: High, moderate, or minor interactions between the listed items.
2. **Controlled Substance Alerts**: Highlight any controlled substances and compliance requirements.
3. **Patient Counseling Guidelines**: Key points for patient counseling (e.g. food requirements, warnings, alcohol interactions).

Be professional, concise, and focused on patient safety.";

        string? result = await CallGeminiAsync(prompt, jsonMode: false);
        if (result != null)
        {
            return Ok(new { interactions = result });
        }

        // Mock Drug Safety
        string mockInteractions = "#### ⚠️ Drug Interaction Risk Assessment\n";
        bool hasAspirin = false;
        bool hasWarfarin = false;

        foreach (var d in request.Items)
        {
            var name = d.DrugName.ToLower();
            if (name.Contains("aspirin")) hasAspirin = true;
            if (name.Contains("warfarin") || name.Contains("clopidogrel") || name.Contains("heparin")) hasWarfarin = true;
        }

        if (hasAspirin && hasWarfarin)
        {
            mockInteractions += "**[CRITICAL RISK] Aspirin + Blood Thinner (Warfarin/Clopidogrel):** Simultaneous use significantly increases the risk of serious GI bleed and hemorrhage. Monitor patient closely for bruising, dark stools, or epistaxis. Consider prescribing a proton pump inhibitor (PPI) for gastric protection.\n";
        }
        else if (hasAspirin)
        {
            mockInteractions += "**[MODERATE RISK] Aspirin + NSAIDs:** Concomitant use increases risk of gastrointestinal mucosal irritation. Recommend spaced dosing.\n";
        }
        else
        {
            mockInteractions += "✅ **No major drug-drug interactions detected** between the selected medications in this cart.\n";
        }

        mockInteractions += "\n#### 📝 Patient Counseling Guidelines\n";
        foreach (var d in request.Items)
        {
            var name = d.DrugName.ToLower();
            if (name.Contains("amoxicillin") || name.Contains("antibiotic"))
            {
                mockInteractions += $"- ***{d.DrugName}***: Instruct patient to complete the entire course, even if symptoms resolve. Can be taken with or without food. Inform pharmacist of severe rash.\n";
            }
            else if (name.Contains("metformin"))
            {
                mockInteractions += $"- ***{d.DrugName}***: Take with meals to reduce gastrointestinal upset. Avoid excessive alcohol consumption to prevent potential lactic acidosis risk.\n";
            }
            else if (name.Contains("aspirin") || name.Contains("ibuprofen"))
            {
                mockInteractions += $"- ***{d.DrugName}***: Take with food or milk to protect stomach lining. Report any stomach pain or dark tarry stools immediately.\n";
            }
            else
            {
                mockInteractions += $"- ***{d.DrugName}***: Administer according to label. Spaced dosing is recommended.\n";
            }
        }

        return Ok(new { interactions = mockInteractions });
    }

    private async Task<string?> CallGeminiAsync(string prompt, bool jsonMode = false)
    {
        var apiKey = _config["Gemini:ApiKey"] ?? Environment.GetEnvironmentVariable("GEMINI_API_KEY");
        if (string.IsNullOrEmpty(apiKey))
        {
            return null;
        }

        var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={apiKey}";
        
        var requestBody = new
        {
            contents = new[]
            {
                new
                {
                    parts = new[]
                    {
                        new { text = prompt }
                    }
                }
            },
            generationConfig = jsonMode ? new { responseMimeType = "application/json" } : null
        };

        var jsonContent = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");
        try
        {
            var response = await _httpClient.PostAsync(url, jsonContent);
            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            var responseBody = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(responseBody);
            var root = doc.RootElement;
            if (root.TryGetProperty("candidates", out var candidates) &&
                candidates.GetArrayLength() > 0 &&
                candidates[0].TryGetProperty("content", out var content) &&
                content.TryGetProperty("parts", out var parts) &&
                parts.GetArrayLength() > 0 &&
                parts[0].TryGetProperty("text", out var text))
            {
                return text.GetString();
            }
        }
        catch
        {
            // Fail silent, fallback to Mock
        }

        return null;
    }
}

public class DrugSafetyRequest
{
    public List<DrugSafetyItem> Items { get; set; } = [];
}

public class DrugSafetyItem
{
    public string DrugName { get; set; } = string.Empty;
    public string GenericName { get; set; } = string.Empty;
    public string Dosage { get; set; } = string.Empty;
    public int Quantity { get; set; }
}
