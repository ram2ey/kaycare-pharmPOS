using PharmPOS.Core.Constants;
using PharmPOS.Core.DTOs.Pharmacy;
using PharmPOS.Core.Entities;
using PharmPOS.Core.Exceptions;
using PharmPOS.Core.Interfaces;
using PharmPOS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace PharmPOS.Infrastructure.Services;

public class StockMovementService : IStockMovementService
{
    private readonly AppDbContext        _db;
    private readonly ITenantContext      _tenantContext;
    private readonly ICurrentUserService _currentUser;

    public StockMovementService(AppDbContext db, ITenantContext tenantContext, ICurrentUserService currentUser)
    {
        _db            = db;
        _tenantContext = tenantContext;
        _currentUser   = currentUser;
    }

    public async Task<StockMovementResponse> RecordMovementAsync(
        Guid    drugInventoryId,
        string  movementType,
        int     quantity,
        Guid?   referenceId   = null,
        string? referenceType = null,
        string? notes         = null,
        CancellationToken ct  = default)
    {
        if (quantity <= 0)
            throw new AppException("Quantity must be greater than zero.", 400);

        if (!StockMovementType.All.Contains(movementType))
            throw new AppException($"Invalid movement type '{movementType}'.", 400);

        var drug = await _db.DrugInventory
            .FirstOrDefaultAsync(d => d.DrugInventoryId == drugInventoryId, ct)
            ?? throw new NotFoundException("DrugInventory", drugInventoryId);

        var previous = drug.CurrentStock;
        int next;

        if (StockMovementType.IsAdditive.Contains(movementType))
        {
            next = previous + quantity;
        }
        else
        {
            if (quantity > previous)
                throw new AppException($"Cannot deduct {quantity} from {drug.Name}: only {previous} in stock.", 400);
            next = previous - quantity;
        }

        drug.CurrentStock = next;

        var movement = new StockMovement
        {
            TenantId        = _tenantContext.TenantId,
            DrugInventoryId = drugInventoryId,
            MovementType    = movementType,
            Quantity        = quantity,
            PreviousStock   = previous,
            NewStock        = next,
            ReferenceId     = referenceId,
            ReferenceType   = referenceType,
            Notes           = notes?.Trim(),
            CreatedByUserId = _currentUser.UserId,
            CreatedAt       = DateTime.UtcNow,
        };

        _db.StockMovements.Add(movement);
        await _db.SaveChangesAsync(ct);

        return ToResponse(movement, drug.Name);
    }

    public async Task<List<StockMovementResponse>> GetMovementsForDrugAsync(Guid drugInventoryId, CancellationToken ct = default)
    {
        _ = await _db.DrugInventory.AsNoTracking()
            .FirstOrDefaultAsync(d => d.DrugInventoryId == drugInventoryId, ct)
            ?? throw new NotFoundException("DrugInventory", drugInventoryId);

        return await _db.StockMovements
            .AsNoTracking()
            .Include(m => m.CreatedBy)
            .Where(m => m.DrugInventoryId == drugInventoryId)
            .OrderByDescending(m => m.CreatedAt)
            .Select(m => new StockMovementResponse
            {
                StockMovementId = m.StockMovementId,
                DrugInventoryId = m.DrugInventoryId,
                DrugName        = m.DrugInventory.Name,
                MovementType    = m.MovementType,
                Quantity        = m.Quantity,
                PreviousStock   = m.PreviousStock,
                NewStock        = m.NewStock,
                ReferenceId     = m.ReferenceId,
                ReferenceType   = m.ReferenceType,
                Notes           = m.Notes,
                CreatedByName   = m.CreatedBy.FirstName + " " + m.CreatedBy.LastName,
                CreatedAt       = m.CreatedAt,
            })
            .ToListAsync(ct);
    }

    private static StockMovementResponse ToResponse(StockMovement m, string drugName) => new()
    {
        StockMovementId = m.StockMovementId,
        DrugInventoryId = m.DrugInventoryId,
        DrugName        = drugName,
        MovementType    = m.MovementType,
        Quantity        = m.Quantity,
        PreviousStock   = m.PreviousStock,
        NewStock        = m.NewStock,
        ReferenceId     = m.ReferenceId,
        ReferenceType   = m.ReferenceType,
        Notes           = m.Notes,
        CreatedByName   = string.Empty,
        CreatedAt       = m.CreatedAt,
    };
}
