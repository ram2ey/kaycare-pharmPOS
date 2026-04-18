using PharmPOS.Core.Constants;
using PharmPOS.Core.DTOs.Pharmacy;
using PharmPOS.Core.Interfaces;
using PharmPOS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace PharmPOS.Infrastructure.Services;

public class CSRegisterService : ICSRegisterService
{
    private readonly AppDbContext _db;

    public CSRegisterService(AppDbContext db) => _db = db;

    public async Task<List<CSRegisterDrugEntry>> GetRegisterAsync(
        DateOnly? from = null,
        DateOnly? to   = null,
        CancellationToken ct = default)
    {
        var fromUtc = from.HasValue ? from.Value.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc) : (DateTime?)null;
        var toUtc   = to.HasValue   ? to.Value.ToDateTime(TimeOnly.MaxValue,   DateTimeKind.Utc) : (DateTime?)null;

        var drugs = await _db.DrugInventory
            .AsNoTracking()
            .Where(d => d.IsControlledSubstance)
            .OrderBy(d => d.Name)
            .ToListAsync(ct);

        var drugIds = drugs.Select(d => d.DrugInventoryId).ToList();

        var movementsQuery = _db.StockMovements
            .AsNoTracking()
            .Include(m => m.CreatedBy)
            .Where(m => drugIds.Contains(m.DrugInventoryId));

        if (fromUtc.HasValue) movementsQuery = movementsQuery.Where(m => m.CreatedAt >= fromUtc.Value);
        if (toUtc.HasValue)   movementsQuery = movementsQuery.Where(m => m.CreatedAt <= toUtc.Value);

        var movements = await movementsQuery
            .OrderBy(m => m.DrugInventoryId)
            .ThenBy(m => m.CreatedAt)
            .ToListAsync(ct);

        var movsByDrug = movements.GroupBy(m => m.DrugInventoryId)
            .ToDictionary(g => g.Key, g => g.ToList());

        return drugs.Select(d =>
        {
            var entries = movsByDrug.GetValueOrDefault(d.DrugInventoryId, []);
            return new CSRegisterDrugEntry
            {
                DrugInventoryId = d.DrugInventoryId,
                DrugName        = d.Name,
                GenericName     = d.GenericName,
                DosageForm      = d.DosageForm,
                Strength        = d.Strength,
                CurrentStock    = d.CurrentStock,
                Movements = entries.Select(m => new CSRegisterMovement
                {
                    StockMovementId = m.StockMovementId,
                    Date            = m.CreatedAt,
                    MovementType    = m.MovementType,
                    QuantityIn      = StockMovementType.IsAdditive.Contains(m.MovementType) ? m.Quantity : null,
                    QuantityOut     = StockMovementType.IsAdditive.Contains(m.MovementType) ? null : m.Quantity,
                    Balance         = m.NewStock,
                    ReferenceType   = m.ReferenceType,
                    Notes           = m.Notes,
                    RecordedBy      = $"{m.CreatedBy.FirstName} {m.CreatedBy.LastName}",
                }).ToList(),
            };
        }).ToList();
    }
}
