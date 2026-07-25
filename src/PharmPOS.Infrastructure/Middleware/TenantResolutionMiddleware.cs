using PharmPOS.Core.Interfaces;
using PharmPOS.Infrastructure.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace PharmPOS.Infrastructure.Middleware;

public class TenantResolutionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<TenantResolutionMiddleware> _logger;

    public TenantResolutionMiddleware(RequestDelegate next, ILogger<TenantResolutionMiddleware> logger)
    {
        _next   = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, AppDbContext db, ITenantContext tenantContext)
    {
        // Bypass tenant resolution for OPTIONS preflight requests and health checks
        if (HttpMethods.IsOptions(context.Request.Method) || context.Request.Path.StartsWithSegments("/health"))
        {
            await _next(context);
            return;
        }

        var rawIdentifier = ResolveIdentifier(context);
        var identifier = rawIdentifier?.Trim().ToLowerInvariant();

        if (string.IsNullOrEmpty(identifier))
        {
            // No tenant header/subdomain — allow the request through.
            // Auth middleware will reject protected endpoints.
            await _next(context);
            return;
        }

        var tenant = await db.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.TenantCode.ToLower() == identifier || t.Subdomain.ToLower() == identifier);

        if (tenant is null || !tenant.IsActive)
        {
            _logger.LogWarning("Tenant not found or inactive: {Identifier}", identifier);
            context.Response.StatusCode = 404;
            await context.Response.WriteAsJsonAsync(new { error = $"Tenant '{identifier}' not found." });
            return;
        }

        tenantContext.TenantId   = tenant.TenantId;
        tenantContext.TenantCode = tenant.TenantCode;

        await _next(context);
    }

    private static string? ResolveIdentifier(HttpContext context)
    {
        // X-Tenant-Code header takes precedence (local dev + API clients)
        var header = context.Request.Headers["X-Tenant-Code"].FirstOrDefault();
        if (!string.IsNullOrEmpty(header)) return header;

        // Subdomain: mypharmacy.pharmos.com → "mypharmacy"
        // Ignore default hosting platform domains (*.onrender.com, *.azurewebsites.net, *.azurestaticapps.net, localhost)
        var host = context.Request.Host.Host;
        if (host.EndsWith(".azurewebsites.net", StringComparison.OrdinalIgnoreCase) ||
            host.EndsWith(".azurestaticapps.net", StringComparison.OrdinalIgnoreCase) ||
            host.EndsWith(".onrender.com", StringComparison.OrdinalIgnoreCase) ||
            host.Equals("localhost", StringComparison.OrdinalIgnoreCase) ||
            host.StartsWith("127.0.0.1"))
            return null;

        var parts = host.Split('.');
        if (parts.Length >= 3) return parts[0];

        return null;
    }
}
