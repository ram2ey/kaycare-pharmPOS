using PharmPOS.Core.Interfaces;

namespace PharmPOS.Infrastructure.Services;

/// <summary>
/// Fallback blob storage implementation used when no storage provider (Supabase / Azure) is configured.
/// Prevents Dependency Injection failures on unconfigured environments.
/// </summary>
public class NullBlobStorageService : IBlobStorageService
{
    public Task UploadAsync(string containerName, string blobPath, Stream content, string contentType, CancellationToken ct = default)
    {
        return Task.CompletedTask;
    }

    public Task DeleteAsync(string containerName, string blobPath, CancellationToken ct = default)
    {
        return Task.CompletedTask;
    }

    public Task<byte[]?> DownloadAsync(string containerName, string blobPath, CancellationToken ct = default)
    {
        return Task.FromResult<byte[]?>(null);
    }

    public Uri GenerateSasUri(string containerName, string blobPath, TimeSpan expiry)
    {
        return new Uri("about:blank");
    }
}
