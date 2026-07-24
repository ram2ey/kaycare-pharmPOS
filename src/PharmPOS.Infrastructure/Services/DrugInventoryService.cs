using PharmPOS.Core.DTOs.Pharmacy;
using PharmPOS.Core.Entities;
using PharmPOS.Core.Exceptions;
using PharmPOS.Core.Interfaces;
using PharmPOS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace PharmPOS.Infrastructure.Services;

public class DrugInventoryService : IDrugInventoryService
{
    private readonly AppDbContext _db;

    public DrugInventoryService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<DrugInventoryResponse>> GetAllAsync(bool? activeOnly, bool? lowStockOnly, string? category, CancellationToken ct = default)
    {
        var query = _db.DrugInventory.AsNoTracking();

        if (activeOnly == true)
            query = query.Where(d => d.IsActive);

        if (lowStockOnly == true)
            query = query.Where(d => d.CurrentStock <= d.ReorderThreshold);

        if (!string.IsNullOrWhiteSpace(category))
            query = query.Where(d => d.Category == category);

        return await query
            .OrderBy(d => d.Category)
            .ThenBy(d => d.Name)
            .Select(d => ToResponse(d))
            .ToListAsync(ct);
    }

    public async Task<DrugInventoryResponse?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var drug = await _db.DrugInventory.AsNoTracking()
            .FirstOrDefaultAsync(d => d.DrugInventoryId == id, ct);
        return drug == null ? null : ToResponse(drug);
    }

    public async Task<DrugInventoryResponse> CreateAsync(SaveDrugRequest request, CancellationToken ct = default)
    {
        var drug = new DrugInventory
        {
            Name                  = request.Name.Trim(),
            GenericName           = request.GenericName?.Trim(),
            DosageForm            = request.DosageForm?.Trim(),
            Strength              = request.Strength?.Trim(),
            Unit                  = request.Unit.Trim(),
            Category              = request.Category?.Trim(),
            CurrentStock          = 0,
            ReorderThreshold      = request.ReorderThreshold,
            UnitCost              = request.UnitCost,
            SellingPrice          = request.SellingPrice,
            IsControlledSubstance = request.IsControlledSubstance,
            IsActive              = request.IsActive,
        };

        _db.DrugInventory.Add(drug);
        await _db.SaveChangesAsync(ct);
        return ToResponse(drug);
    }

    public async Task<DrugInventoryResponse> UpdateAsync(Guid id, SaveDrugRequest request, CancellationToken ct = default)
    {
        var drug = await _db.DrugInventory
            .FirstOrDefaultAsync(d => d.DrugInventoryId == id, ct)
            ?? throw new NotFoundException("DrugInventory", id);

        drug.Name                  = request.Name.Trim();
        drug.GenericName           = request.GenericName?.Trim();
        drug.DosageForm            = request.DosageForm?.Trim();
        drug.Strength              = request.Strength?.Trim();
        drug.Unit                  = request.Unit.Trim();
        drug.Category              = request.Category?.Trim();
        drug.ReorderThreshold      = request.ReorderThreshold;
        drug.UnitCost              = request.UnitCost;
        drug.SellingPrice          = request.SellingPrice;
        drug.IsControlledSubstance = request.IsControlledSubstance;
        drug.IsActive              = request.IsActive;

        await _db.SaveChangesAsync(ct);
        return ToResponse(drug);
    }

    public async Task<DrugInventoryResponse> DeactivateAsync(Guid id, CancellationToken ct = default)
    {
        var drug = await _db.DrugInventory
            .FirstOrDefaultAsync(d => d.DrugInventoryId == id, ct)
            ?? throw new NotFoundException("DrugInventory", id);

        drug.IsActive = false;
        await _db.SaveChangesAsync(ct);
        return ToResponse(drug);
    }

    public async Task<List<ReorderAlertResponse>> GetReorderAlertsAsync(CancellationToken ct = default)
    {
        return await _db.DrugInventory
            .AsNoTracking()
            .Where(d => d.IsActive && d.CurrentStock <= d.ReorderThreshold)
            .OrderBy(d => d.CurrentStock)
            .Select(d => new ReorderAlertResponse
            {
                DrugInventoryId  = d.DrugInventoryId,
                Name             = d.Name,
                GenericName      = d.GenericName,
                DosageForm       = d.DosageForm,
                Strength         = d.Strength,
                Category         = d.Category,
                CurrentStock     = d.CurrentStock,
                ReorderThreshold = d.ReorderThreshold,
                Deficit          = d.ReorderThreshold - d.CurrentStock,
            })
            .ToListAsync(ct);
    }

    public async Task<BulkImportResult> BulkImportAsync(IEnumerable<SaveDrugRequest> rows, CancellationToken ct = default)
    {
        var added   = 0;
        var skipped = 0;

        // Load existing drug keys to detect duplicates efficiently
        var existingKeysList = await _db.DrugInventory
            .AsNoTracking()
            .Select(d => d.Name.ToLower() + "|" + (d.Strength ?? "").ToLower() + "|" + (d.DosageForm ?? "").ToLower())
            .ToListAsync(ct);
        var existingKeys = existingKeysList.ToHashSet();

        foreach (var row in rows)
        {
            if (string.IsNullOrWhiteSpace(row.Name)) { skipped++; continue; }

            var key = row.Name.Trim().ToLower() + "|"
                    + (row.Strength?.Trim().ToLower() ?? "") + "|"
                    + (row.DosageForm?.Trim().ToLower() ?? "");

            if (existingKeys.Contains(key)) { skipped++; continue; }

            _db.DrugInventory.Add(new DrugInventory
            {
                Name                  = row.Name.Trim(),
                GenericName           = row.GenericName?.Trim(),
                DosageForm            = row.DosageForm?.Trim(),
                Strength              = row.Strength?.Trim(),
                Unit                  = row.Unit?.Trim() ?? "Tablets",
                Category              = row.Category?.Trim(),
                CurrentStock          = 0,
                ReorderThreshold      = row.ReorderThreshold > 0 ? row.ReorderThreshold : 10,
                UnitCost              = row.UnitCost,
                SellingPrice          = row.SellingPrice,
                IsControlledSubstance = row.IsControlledSubstance,
                IsActive              = true,
            });

            existingKeys.Add(key);
            added++;
        }

        if (added > 0) await _db.SaveChangesAsync(ct);

        return new BulkImportResult(added, skipped);
    }

    private static DrugInventoryResponse ToResponse(DrugInventory d) => new()
    {
        DrugInventoryId       = d.DrugInventoryId,
        Name                  = d.Name,
        GenericName           = d.GenericName,
        DosageForm            = d.DosageForm,
        Strength              = d.Strength,
        Unit                  = d.Unit,
        Category              = d.Category,
        CurrentStock          = d.CurrentStock,
        ReorderThreshold      = d.ReorderThreshold,
        IsLowStock            = d.CurrentStock <= d.ReorderThreshold,
        UnitCost              = d.UnitCost,
        SellingPrice          = d.SellingPrice,
        IsControlledSubstance = d.IsControlledSubstance,
        IsActive              = d.IsActive,
        CreatedAt             = d.CreatedAt,
        UpdatedAt             = d.UpdatedAt,
    };
}

