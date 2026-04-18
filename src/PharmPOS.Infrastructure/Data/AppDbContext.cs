using PharmPOS.Core.Entities;
using PharmPOS.Core.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace PharmPOS.Infrastructure.Data;

public class AppDbContext : DbContext
{
    private readonly ITenantContext _tenantContext;

    public AppDbContext(DbContextOptions<AppDbContext> options, ITenantContext tenantContext)
        : base(options)
    {
        _tenantContext = tenantContext;
    }

    public DbSet<Tenant>           Tenants           => Set<Tenant>();
    public DbSet<FacilitySettings> FacilitySettings  => Set<FacilitySettings>();
    public DbSet<Role>             Roles              => Set<Role>();
    public DbSet<User>             Users              => Set<User>();
    public DbSet<DrugInventory>    DrugInventory      => Set<DrugInventory>();
    public DbSet<StockMovement>    StockMovements     => Set<StockMovement>();
    public DbSet<Supplier>         Suppliers          => Set<Supplier>();
    public DbSet<PurchaseOrder>    PurchaseOrders     => Set<PurchaseOrder>();
    public DbSet<PurchaseOrderItem> PurchaseOrderItems => Set<PurchaseOrderItem>();
    public DbSet<Sale>             Sales              => Set<Sale>();
    public DbSet<SaleItem>         SaleItems          => Set<SaleItem>();
    public DbSet<Customer>         Customers          => Set<Customer>();
    public DbSet<AuditLog>         AuditLogs          => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        // Global tenant isolation
        modelBuilder.Entity<User>()
            .HasQueryFilter(u => u.TenantId == _tenantContext.TenantId);
        modelBuilder.Entity<FacilitySettings>()
            .HasQueryFilter(f => f.TenantId == _tenantContext.TenantId);
        modelBuilder.Entity<DrugInventory>()
            .HasQueryFilter(d => d.TenantId == _tenantContext.TenantId);
        modelBuilder.Entity<StockMovement>()
            .HasQueryFilter(m => m.TenantId == _tenantContext.TenantId);
        modelBuilder.Entity<Supplier>()
            .HasQueryFilter(s => s.TenantId == _tenantContext.TenantId);
        modelBuilder.Entity<PurchaseOrder>()
            .HasQueryFilter(po => po.TenantId == _tenantContext.TenantId);
        modelBuilder.Entity<PurchaseOrderItem>()
            .HasQueryFilter(i => i.TenantId == _tenantContext.TenantId);
        modelBuilder.Entity<Sale>()
            .HasQueryFilter(s => s.TenantId == _tenantContext.TenantId);
        modelBuilder.Entity<SaleItem>()
            .HasQueryFilter(i => i.TenantId == _tenantContext.TenantId);
        modelBuilder.Entity<Customer>()
            .HasQueryFilter(c => c.TenantId == _tenantContext.TenantId);
        modelBuilder.Entity<AuditLog>()
            .HasQueryFilter(a => a.TenantId == _tenantContext.TenantId);
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;

        foreach (var entry in ChangeTracker.Entries<TenantEntity>())
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    entry.Entity.TenantId = _tenantContext.TenantId;
                    entry.Entity.CreatedAt = now;
                    entry.Entity.UpdatedAt = now;
                    break;
                case EntityState.Modified:
                    entry.Entity.UpdatedAt = now;
                    break;
            }
        }

        return await base.SaveChangesAsync(cancellationToken);
    }
}
