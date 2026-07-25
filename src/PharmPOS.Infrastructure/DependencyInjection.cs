using Azure.Storage.Blobs;
using PharmPOS.Core.Interfaces;
using PharmPOS.Infrastructure.Data;
using PharmPOS.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using QuestPDF.Infrastructure;

namespace PharmPOS.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration config)
    {
        // QuestPDF community license (revenue < $1M USD)
        QuestPDF.Settings.License = LicenseType.Community;

        // Per-request tenant context (populated by TenantResolutionMiddleware)
        services.AddScoped<ITenantContext, TenantContext>();

        var connectionString = GetPostgresConnectionString(config);

        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(
                connectionString,
                b => b.MigrationsAssembly(typeof(AppDbContext).Assembly.FullName)
            )
        );

        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUserService, CurrentUserService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<ITenantService, TenantService>();
        services.AddScoped<ITokenService, TokenService>();
        services.AddScoped<IUserManagementService, UserManagementService>();
        services.AddScoped<IFacilitySettingsService, FacilitySettingsService>();
        services.AddScoped<IDrugInventoryService, DrugInventoryService>();
        services.AddScoped<IStockMovementService, StockMovementService>();
        services.AddScoped<ISupplierService, SupplierService>();
        services.AddScoped<IPurchaseOrderService, PurchaseOrderService>();
        services.AddScoped<ICSRegisterService, CSRegisterService>();
        services.AddScoped<ICSRegisterReportService, CSRegisterReportService>();
        services.AddScoped<ICustomerService, CustomerService>();
        services.AddScoped<ISaleService, SaleService>();
        services.AddScoped<ISaleReceiptService, SaleReceiptService>();
        services.AddScoped<IAuditService, AuditService>();

        // Blob Storage — Supabase Storage, Azure Blob Storage, or Null Fallback
        var supabaseUrl = config["SUPABASE_URL"] ?? config["Supabase:Url"];
        var supabaseKey = config["SUPABASE_KEY"] ?? config["Supabase:Key"];
        var blobConn     = config["BlobStorage:ConnectionString"];

        if (!string.IsNullOrWhiteSpace(supabaseUrl) && !string.IsNullOrWhiteSpace(supabaseKey))
        {
            services.AddHttpClient<IBlobStorageService, SupabaseStorageService>();
        }
        else if (!string.IsNullOrWhiteSpace(blobConn) && blobConn != "UseDevelopmentStorage=true")
        {
            services.AddSingleton(_ => new BlobServiceClient(blobConn));
            services.AddSingleton<IBlobStorageService, BlobStorageService>();
        }
        else
        {
            services.AddSingleton<IBlobStorageService, NullBlobStorageService>();
        }

        return services;
    }

    private static string GetPostgresConnectionString(IConfiguration config)
    {
        var connStr = config["DATABASE_URL"]
            ?? config.GetConnectionString("DefaultConnection")
            ?? "Host=localhost;Database=PharmPOSDb;Username=postgres;Password=postgres";

        if (connStr.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) ||
            connStr.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
        {
            var uri = new Uri(connStr);
            var userInfo = uri.UserInfo;
            var colonIdx = userInfo.IndexOf(':');
            var user = colonIdx >= 0 ? Uri.UnescapeDataString(userInfo[..colonIdx]) : Uri.UnescapeDataString(userInfo);
            var password = colonIdx >= 0 ? Uri.UnescapeDataString(userInfo[(colonIdx + 1)..]) : "";
            var host = uri.Host;
            var port = uri.Port > 0 ? uri.Port : 5432;
            var database = uri.AbsolutePath.TrimStart('/');

            return $"Host={host};Port={port};Database={database};Username={user};Password={password};SSL Mode=Require;Trust Server Certificate=true;";
        }

        if (!connStr.Contains("SSL Mode", StringComparison.OrdinalIgnoreCase) &&
            !connStr.Contains("SslMode", StringComparison.OrdinalIgnoreCase) &&
            !connStr.Contains("localhost", StringComparison.OrdinalIgnoreCase) &&
            !connStr.Contains("127.0.0.1"))
        {
            connStr = connStr.TrimEnd(';') + ";SSL Mode=Require;Trust Server Certificate=true;";
        }

        return connStr;
    }
}
