using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Sas;
using PharmPOS.Core.Interfaces;

namespace PharmPOS.Infrastructure.Services;

public class BlobStorageService : IBlobStorageService
{
    private readonly BlobServiceClient _serviceClient;

    public BlobStorageService(BlobServiceClient serviceClient)
    {
        _serviceClient = serviceClient;
    }

    public async Task UploadAsync(string containerName, string blobPath, Stream content, string contentType, CancellationToken ct = default)
    {
        var containerClient = _serviceClient.GetBlobContainerClient(containerName);

        // Create the per-tenant container with no public access if it doesn't exist
        await containerClient.CreateIfNotExistsAsync(PublicAccessType.None, cancellationToken: ct);

        var blobClient = containerClient.GetBlobClient(blobPath);
        await blobClient.UploadAsync(content, new BlobHttpHeaders { ContentType = contentType }, cancellationToken: ct);
    }

    public async Task DeleteAsync(string containerName, string blobPath, CancellationToken ct = default)
    {
        var blobClient = _serviceClient
            .GetBlobContainerClient(containerName)
            .GetBlobClient(blobPath);

        await blobClient.DeleteIfExistsAsync(cancellationToken: ct);
    }

    public async Task<byte[]?> DownloadAsync(string containerName, string blobPath, CancellationToken ct = default)
    {
        var blobClient = _serviceClient
            .GetBlobContainerClient(containerName)
            .GetBlobClient(blobPath);

        if (!await blobClient.ExistsAsync(ct))
            return null;

        var response = await blobClient.DownloadContentAsync(ct);
        return response.Value.Content.ToArray();
    }

    public Uri GenerateSasUri(string containerName, string blobPath, TimeSpan expiry)
    {
        var blobClient = _serviceClient
            .GetBlobContainerClient(containerName)
            .GetBlobClient(blobPath);

        var sasBuilder = new BlobSasBuilder(BlobSasPermissions.Read, DateTimeOffset.UtcNow.Add(expiry))
        {
            BlobContainerName = containerName,
            BlobName          = blobPath,
            Resource          = "b"
        };

        return blobClient.GenerateSasUri(sasBuilder);
    }
}
