using PharmPOS.Core.DTOs.Pharmacy;
using PharmPOS.Core.Entities;
using PharmPOS.Core.Exceptions;
using PharmPOS.Core.Interfaces;
using PharmPOS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace PharmPOS.Infrastructure.Services;

public class CustomerService : ICustomerService
{
    private readonly AppDbContext   _db;
    private readonly ITenantContext _tenantContext;

    public CustomerService(AppDbContext db, ITenantContext tenantContext)
    {
        _db            = db;
        _tenantContext = tenantContext;
    }

    public async Task<List<CustomerResponse>> GetAllAsync(string? search, CancellationToken ct)
    {
        var query = _db.Customers.AsNoTracking().Where(c => c.IsActive);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(c =>
                c.Name.ToLower().Contains(s) ||
                (c.Phone != null && c.Phone.Contains(s)) ||
                (c.Email != null && c.Email.ToLower().Contains(s)));
        }

        return await query
            .OrderBy(c => c.Name)
            .Select(c => ToResponse(c))
            .ToListAsync(ct);
    }

    public async Task<CustomerResponse> GetByIdAsync(Guid customerId, CancellationToken ct)
    {
        var customer = await _db.Customers.AsNoTracking()
            .FirstOrDefaultAsync(c => c.CustomerId == customerId, ct)
            ?? throw new NotFoundException("Customer", customerId);

        return ToResponse(customer);
    }

    public async Task<CustomerResponse> CreateAsync(SaveCustomerRequest request, CancellationToken ct)
    {
        var customer = new Customer
        {
            TenantId  = _tenantContext.TenantId,
            Name      = request.Name.Trim(),
            Phone     = request.Phone?.Trim(),
            Email     = request.Email?.Trim().ToLowerInvariant(),
            Notes     = request.Notes?.Trim(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _db.Customers.Add(customer);
        await _db.SaveChangesAsync(ct);
        return ToResponse(customer);
    }

    public async Task<CustomerResponse> UpdateAsync(Guid customerId, SaveCustomerRequest request, CancellationToken ct)
    {
        var customer = await _db.Customers
            .FirstOrDefaultAsync(c => c.CustomerId == customerId, ct)
            ?? throw new NotFoundException("Customer", customerId);

        customer.Name      = request.Name.Trim();
        customer.Phone     = request.Phone?.Trim();
        customer.Email     = request.Email?.Trim().ToLowerInvariant();
        customer.Notes     = request.Notes?.Trim();
        customer.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);
        return ToResponse(customer);
    }

    public async Task DeactivateAsync(Guid customerId, CancellationToken ct)
    {
        var customer = await _db.Customers
            .FirstOrDefaultAsync(c => c.CustomerId == customerId, ct)
            ?? throw new NotFoundException("Customer", customerId);

        customer.IsActive  = false;
        customer.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
    }

    private static CustomerResponse ToResponse(Customer c) => new()
    {
        CustomerId = c.CustomerId,
        Name       = c.Name,
        Phone      = c.Phone,
        Email      = c.Email,
        Notes      = c.Notes,
        IsActive   = c.IsActive,
    };
}
