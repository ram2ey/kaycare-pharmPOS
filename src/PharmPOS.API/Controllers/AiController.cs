using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PharmPOS.Core.Entities;
using PharmPOS.Core.Interfaces;
using PharmPOS.Infrastructure.Data;

namespace PharmPOS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AiController : ControllerBase
{
    private readonly IConfiguration _config;
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenantContext;
    private static readonly HttpClient _httpClient = new();

    private static readonly string[] FreeModelsFallback = new[]
    {
        "meta-llama/llama-3.3-70b-instruct:free",
        "google/gemini-2.0-flash-lite-preview:free",
        "deepseek/deepseek-r1:free",
        "qwen/qwen-2.5-coder-32b-instruct:free"
    };

    private static readonly string[] ProModelsFallback = new[]
    {
        "openai/gpt-4o-mini",
        "google/gemini-2.0-flash",
        "meta-llama/llama-3.3-70b-instruct:free"
    };

    private static readonly string[] FreeVisionModelsFallback = new[]
    {
        "google/gemini-2.0-flash-lite-preview:free",
        "meta-llama/llama-3.2-11b-vision-instruct:free"
    };

    private static readonly string[] ProVisionModelsFallback = new[]
    {
        "openai/gpt-4o-mini",
        "google/gemini-2.0-flash"
    };

    public AiController(IConfiguration config, AppDbContext db, ITenantContext tenantContext)
    {
        _config = config;
        _db = db;
        _tenantContext = tenantContext;
    }

    [HttpPost("drug-safety")]
    public async Task<IActionResult> DrugSafety([FromBody] DrugSafetyRequest request, CancellationToken ct)
    {
        var (allowed, errorResult, tenant) = await ValidateAiAccessAsync(ct);
        if (!allowed) return errorResult!;

        string drugsJson = JsonSerializer.Serialize(request.Items);
        string prompt = $@"You are a Clinical Pharmacist. Review the following medication cart for potential safety risks, drug-drug interactions, and controlled substance flags.
Medications:
{drugsJson}

Provide a structured response in Markdown containing:
1. **Drug-Drug Interactions**: High, moderate, or minor interactions between the listed items.
2. **Controlled Substance Alerts**: Highlight any controlled substances and compliance requirements.
3. **Patient Counseling Guidelines**: Key points for patient counseling (e.g. food requirements, warnings, alcohol interactions).

Be professional, concise, and focused on patient safety.";

        string? result = await CallOpenRouterFreeModelsAsync(prompt, tenant);

        if (result != null)
        {
            await TrackAiUsageAsync(tenant, ct);
            return Ok(new { interactions = result });
        }

        return StatusCode(503, new { message = "AI Assistant is temporarily unavailable.", error = "AI Assistant is temporarily unavailable." });
    }

    [HttpPost("prescription-ocr")]
    public async Task<IActionResult> PrescriptionOcr([FromBody] PrescriptionOcrRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Base64Image))
        {
            return BadRequest(new { error = "Image is required." });
        }

        var (allowed, errorResult, tenant) = await ValidateAiAccessAsync(ct);
        if (!allowed) return errorResult!;

        string prompt = @"You are a Clinical Pharmacist and Medical Document Parser. Analyze this prescription image or handwritten doctor note.
Extract all prescribed medications into a JSON array of objects with the following schema:
- drugName: Name of the medication (brand or generic)
- dosage: Strength/dosage (e.g. 500mg, 10ml)
- frequency: How often to take (e.g. Once daily, Twice daily, Every 8 hours)
- duration: Duration of treatment (e.g. 7 days, 1 month)
- quantity: Estimated numeric quantity to dispense (integer)
- instructions: Special instructions (e.g. Take after meals)

Return ONLY a raw JSON array matching this schema without any markdown backticks or explanation text.";

        string? result = await CallOpenRouterMultimodalAsync(prompt, request.Base64Image, request.MimeType ?? "image/jpeg", tenant);

        if (result != null)
        {
            try
            {
                var cleaned = result.Trim();
                if (cleaned.StartsWith("```"))
                {
                    cleaned = cleaned.Substring(cleaned.IndexOf('\n')).Trim();
                    if (cleaned.EndsWith("```"))
                        cleaned = cleaned.Substring(0, cleaned.Length - 3).Trim();
                }
                using var doc = JsonDocument.Parse(cleaned);
                await TrackAiUsageAsync(tenant, ct);
                return Content(cleaned, "application/json");
            }
            catch
            {
                // Fall through
            }
        }

        return StatusCode(503, new { message = "AI Assistant is temporarily unavailable.", error = "AI Assistant is temporarily unavailable." });
    }

    private async Task<(bool Allowed, IActionResult? ErrorResult, Tenant? Tenant)> ValidateAiAccessAsync(CancellationToken ct)
    {
        var tenantId = _tenantContext.TenantId;
        if (tenantId == Guid.Empty) return (true, null, null);

        var tenant = await _db.Tenants.FirstOrDefaultAsync(t => t.TenantId == tenantId, ct);
        if (tenant == null) return (true, null, null);

        // 1. Lock Check
        if (!tenant.IsAiEnabled)
        {
            return (false, StatusCode(403, new { error = "AI Assistant features are disabled / opted-out for this facility. Contact your administrator to enable AI." }), tenant);
        }

        // 2. Monthly Quota Check
        if (tenant.AiRequestsThisMonth >= tenant.AiMonthlyQuota)
        {
            return (false, StatusCode(429, new { error = $"Monthly AI Assistant quota ({tenant.AiMonthlyQuota} requests) reached for this facility. Please contact your administrator to upgrade your plan." }), tenant);
        }

        return (true, null, tenant);
    }

    private async Task TrackAiUsageAsync(Tenant? tenant, CancellationToken ct)
    {
        if (tenant == null) return;
        try
        {
            tenant.AiRequestsThisMonth += 1;
            await _db.SaveChangesAsync(ct);
        }
        catch
        {
            // Non-blocking usage update
        }
    }

    private async Task<string?> CallOpenRouterFreeModelsAsync(string prompt, Tenant? tenant)
    {
        var apiKey = !string.IsNullOrWhiteSpace(tenant?.CustomOpenRouterKey)
            ? tenant.CustomOpenRouterKey
            : (_config["OpenRouter:ApiKey"]
                  ?? _config["OPENROUTER_API_KEY"]
                  ?? Environment.GetEnvironmentVariable("OPENROUTER_API_KEY")
                  ?? _config["Gemini:ApiKey"]
                  ?? Environment.GetEnvironmentVariable("GEMINI_API_KEY"));

        if (string.IsNullOrEmpty(apiKey)) return null;

        string[] modelsToUse;
        var tier = tenant?.AllowedAiTiers ?? tenant?.SubscriptionPlan ?? "Standard";

        if (tier.Equals("Enterprise", StringComparison.OrdinalIgnoreCase) || tier.Equals("Pro", StringComparison.OrdinalIgnoreCase))
            modelsToUse = ProModelsFallback;
        else
            modelsToUse = FreeModelsFallback;

        var customModel = _config["OpenRouter:Model"]
                       ?? _config["OPENROUTER_MODEL"]
                       ?? Environment.GetEnvironmentVariable("OPENROUTER_MODEL");

        if (!string.IsNullOrWhiteSpace(customModel) && customModel != "openrouter/auto")
        {
            modelsToUse = new[] { customModel };
        }

        var requestBody = new
        {
            models = modelsToUse,
            messages = new[]
            {
                new { role = "user", content = prompt }
            }
        };

        var jsonContent = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");

        try
        {
            using var req = new HttpRequestMessage(HttpMethod.Post, "https://openrouter.ai/api/v1/chat/completions");
            req.Headers.Add("Authorization", $"Bearer {apiKey}");
            req.Headers.Add("HTTP-Referer", "https://kaycare-pharmpos.onrender.com");
            req.Headers.Add("X-Title", "KayCare PharmPOS");
            req.Content = jsonContent;

            var response = await _httpClient.SendAsync(req);
            if (!response.IsSuccessStatusCode) return null;

            var responseBody = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(responseBody);
            var root = doc.RootElement;

            if (root.TryGetProperty("choices", out var choices) &&
                choices.GetArrayLength() > 0 &&
                choices[0].TryGetProperty("message", out var message) &&
                message.TryGetProperty("content", out var content))
            {
                return content.GetString();
            }
        }
        catch
        {
            // Fail silent
        }

        return null;
    }

    private async Task<string?> CallOpenRouterMultimodalAsync(string prompt, string base64Data, string mimeType, Tenant? tenant)
    {
        var apiKey = !string.IsNullOrWhiteSpace(tenant?.CustomOpenRouterKey)
            ? tenant.CustomOpenRouterKey
            : (_config["OpenRouter:ApiKey"]
                  ?? _config["OPENROUTER_API_KEY"]
                  ?? Environment.GetEnvironmentVariable("OPENROUTER_API_KEY")
                  ?? _config["Gemini:ApiKey"]
                  ?? Environment.GetEnvironmentVariable("GEMINI_API_KEY"));

        if (string.IsNullOrEmpty(apiKey)) return null;

        var imageUrl = base64Data.StartsWith("data:") ? base64Data : $"data:{mimeType};base64,{base64Data}";

        string[] modelsToUse;
        var tier = tenant?.AllowedAiTiers ?? tenant?.SubscriptionPlan ?? "Standard";

        if (tier.Equals("Enterprise", StringComparison.OrdinalIgnoreCase) || tier.Equals("Pro", StringComparison.OrdinalIgnoreCase))
            modelsToUse = ProVisionModelsFallback;
        else
            modelsToUse = FreeVisionModelsFallback;

        var customModel = _config["OpenRouter:Model"]
                       ?? _config["OPENROUTER_MODEL"]
                       ?? Environment.GetEnvironmentVariable("OPENROUTER_MODEL");

        if (!string.IsNullOrWhiteSpace(customModel) && customModel != "openrouter/auto")
        {
            modelsToUse = new[] { customModel };
        }

        var requestBody = new
        {
            models = modelsToUse,
            messages = new[]
            {
                new
                {
                    role = "user",
                    content = new object[]
                    {
                        new { type = "text", text = prompt },
                        new
                        {
                            type = "image_url",
                            image_url = new { url = imageUrl }
                        }
                    }
                }
            }
        };

        var jsonContent = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");

        try
        {
            using var req = new HttpRequestMessage(HttpMethod.Post, "https://openrouter.ai/api/v1/chat/completions");
            req.Headers.Add("Authorization", $"Bearer {apiKey}");
            req.Headers.Add("HTTP-Referer", "https://kaycare-pharmpos.onrender.com");
            req.Headers.Add("X-Title", "KayCare PharmPOS");
            req.Content = jsonContent;

            var response = await _httpClient.SendAsync(req);
            if (!response.IsSuccessStatusCode) return null;

            var responseBody = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(responseBody);
            var root = doc.RootElement;

            if (root.TryGetProperty("choices", out var choices) &&
                choices.GetArrayLength() > 0 &&
                choices[0].TryGetProperty("message", out var message) &&
                message.TryGetProperty("content", out var content))
            {
                return content.GetString();
            }
        }
        catch
        {
            // Fail silent
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

public class PrescriptionOcrRequest
{
    public string Base64Image { get; set; } = string.Empty;
    public string? MimeType { get; set; }
}
