using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using PharmPOS.Core.Interfaces;

namespace PharmPOS.Infrastructure.Services;

/// <summary>
/// Storage provider for Supabase Storage REST API.
/// </summary>
public class SupabaseStorageService : IBlobStorageService
{
    private readonly HttpClient _httpClient;
    private readonly string _supabaseUrl;
    private readonly string _supabaseKey;

    public SupabaseStorageService(HttpClient httpClient, IConfiguration config)
    {
        _httpClient = httpClient;
        _supabaseUrl = (config["SUPABASE_URL"] ?? config["Supabase:Url"] ?? "").TrimEnd('/');
        _supabaseKey = config["SUPABASE_KEY"] ?? config["Supabase:Key"] ?? "";
    }

    public async Task UploadAsync(string containerName, string blobPath, Stream content, string contentType, CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(_supabaseUrl) || string.IsNullOrEmpty(_supabaseKey))
            return;

        var url = $"{_supabaseUrl}/storage/v1/object/{containerName}/{blobPath}";
        using var request = new HttpRequestMessage(HttpMethod.Post, url);
        request.Headers.Add("Authorization", $"Bearer {_supabaseKey}");
        request.Headers.Add("apikey", _supabaseKey);
        request.Headers.Add("x-upsert", "true");

        request.Content = new StreamContent(content);
        request.Content.Headers.ContentType = new MediaTypeHeaderValue(contentType);

        var response = await _httpClient.SendAsync(request, ct);
        response.EnsureSuccessStatusCode();
    }

    public async Task DeleteAsync(string containerName, string blobPath, CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(_supabaseUrl) || string.IsNullOrEmpty(_supabaseKey))
            return;

        var url = $"{_supabaseUrl}/storage/v1/object/{containerName}";
        using var request = new HttpRequestMessage(HttpMethod.Delete, url);
        request.Headers.Add("Authorization", $"Bearer {_supabaseKey}");
        request.Headers.Add("apikey", _supabaseKey);

        var payload = JsonSerializer.Serialize(new { prefixes = new[] { blobPath } });
        request.Content = new StringContent(payload, Encoding.UTF8, "application/json");

        await _httpClient.SendAsync(request, ct);
    }

    public async Task<byte[]?> DownloadAsync(string containerName, string blobPath, CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(_supabaseUrl) || string.IsNullOrEmpty(_supabaseKey))
            return null;

        var url = $"{_supabaseUrl}/storage/v1/object/authenticated/{containerName}/{blobPath}";
        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Add("Authorization", $"Bearer {_supabaseKey}");
        request.Headers.Add("apikey", _supabaseKey);

        var response = await _httpClient.SendAsync(request, ct);
        if (!response.IsSuccessStatusCode)
        {
            // Fallback attempt to public object URL
            var publicUrl = $"{_supabaseUrl}/storage/v1/object/public/{containerName}/{blobPath}";
            using var publicReq = new HttpRequestMessage(HttpMethod.Get, publicUrl);
            var publicResp = await _httpClient.SendAsync(publicReq, ct);
            if (!publicResp.IsSuccessStatusCode)
                return null;

            return await publicResp.Content.ReadAsByteArrayAsync(ct);
        }

        return await response.Content.ReadAsByteArrayAsync(ct);
    }

    public Uri GenerateSasUri(string containerName, string blobPath, TimeSpan expiry)
    {
        if (string.IsNullOrEmpty(_supabaseUrl))
            return new Uri("about:blank");

        var url = $"{_supabaseUrl}/storage/v1/object/public/{containerName}/{blobPath}";
        return new Uri(url);
    }
}
