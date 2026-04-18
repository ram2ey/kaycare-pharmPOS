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

        services.AddDbContext<AppDbContext>(options =>
            options.UseSqlServer(
                config.GetConnectionString("DefaultConnection"),
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

        // Azure Blob Storage — singleton client; scoped service
        services.AddSingleton(_ =>
            new BlobServiceClient(config["BlobStorage:ConnectionString"]));
        services.AddSingleton<IBlobStorageService, BlobStorageService>();

        return services;
    }
}
