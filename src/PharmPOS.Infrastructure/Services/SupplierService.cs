using PharmPOS.Core.DTOs.Pharmacy;
using PharmPOS.Core.Entities;
using PharmPOS.Core.Exceptions;
using PharmPOS.Core.Interfaces;
using PharmPOS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace PharmPOS.Infrastructure.Services;

public class SupplierService : ISupplierService
{
    private readonly AppDbContext _db;

    public SupplierService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<SupplierResponse>> GetAllAsync(bool? activeOnly = null, CancellationToken ct = default)
    {
        var query = _db.Suppliers.AsNoTracking();

        if (activeOnly == true)
            query = query.Where(s => s.IsActive);

        return await query
            .OrderBy(s => s.Name)
            .Select(s => ToResponse(s))
            .ToListAsync(ct);
    }

    public async Task<SupplierResponse?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var s = await _db.Suppliers.AsNoTracking()
            .FirstOrDefaultAsync(s => s.SupplierId == id, ct);
        return s == null ? null : ToResponse(s);
    }

    public async Task<SupplierResponse> CreateAsync(SaveSupplierRequest request, CancellationToken ct = default)
    {
        var supplier = new Supplier
        {
            Name        = request.Name.Trim(),
            ContactName = request.ContactName?.Trim(),
            Phone       = request.Phone?.Trim(),
            Email       = request.Email?.Trim(),
            Address     = request.Address?.Trim(),
            Notes       = request.Notes?.Trim(),
            IsActive    = request.IsActive,
        };

        _db.Suppliers.Add(supplier);
        await _db.SaveChangesAsync(ct);
        return ToResponse(supplier);
    }

    public async Task<SupplierResponse> UpdateAsync(Guid id, SaveSupplierRequest request, CancellationToken ct = default)
    {
        var supplier = await _db.Suppliers
            .FirstOrDefaultAsync(s => s.SupplierId == id, ct)
            ?? throw new NotFoundException("Supplier", id);

        supplier.Name        = request.Name.Trim();
        supplier.ContactName = request.ContactName?.Trim();
        supplier.Phone       = request.Phone?.Trim();
        supplier.Email       = request.Email?.Trim();
        supplier.Address     = request.Address?.Trim();
        supplier.Notes       = request.Notes?.Trim();
        supplier.IsActive    = request.IsActive;

        await _db.SaveChangesAsync(ct);
        return ToResponse(supplier);
    }

    public async Task<SupplierResponse> DeactivateAsync(Guid id, CancellationToken ct = default)
    {
        var supplier = await _db.Suppliers
            .FirstOrDefaultAsync(s => s.SupplierId == id, ct)
            ?? throw new NotFoundException("Supplier", id);

        supplier.IsActive = false;
        await _db.SaveChangesAsync(ct);
        return ToResponse(supplier);
    }

    private static SupplierResponse ToResponse(Supplier s) => new()
    {
        SupplierId  = s.SupplierId,
        Name        = s.Name,
        ContactName = s.ContactName,
        Phone       = s.Phone,
        Email       = s.Email,
        Address     = s.Address,
        Notes       = s.Notes,
        IsActive    = s.IsActive,
        CreatedAt   = s.CreatedAt,
        UpdatedAt   = s.UpdatedAt,
    };
}
