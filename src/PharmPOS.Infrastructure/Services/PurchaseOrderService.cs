using PharmPOS.Core.Constants;
using PharmPOS.Core.DTOs.Pharmacy;
using PharmPOS.Core.Entities;
using PharmPOS.Core.Exceptions;
using PharmPOS.Core.Interfaces;
using PharmPOS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace PharmPOS.Infrastructure.Services;

public class PurchaseOrderService : IPurchaseOrderService
{
    private readonly AppDbContext        _db;
    private readonly ITenantContext      _tenantContext;
    private readonly ICurrentUserService _currentUser;

    public PurchaseOrderService(AppDbContext db, ITenantContext tenantContext, ICurrentUserService currentUser)
    {
        _db            = db;
        _tenantContext = tenantContext;
        _currentUser   = currentUser;
    }

    public async Task<List<PurchaseOrderSummaryResponse>> GetAllAsync(
        string? status     = null,
        Guid?   supplierId = null,
        CancellationToken ct = default)
    {
        var query = _db.PurchaseOrders
            .AsNoTracking()
            .Include(po => po.Supplier)
            .Include(po => po.Items)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(po => po.Status == status);

        if (supplierId.HasValue)
            query = query.Where(po => po.SupplierId == supplierId.Value);

        return await query
            .OrderByDescending(po => po.OrderDate)
            .Select(po => new PurchaseOrderSummaryResponse
            {
                PurchaseOrderId      = po.PurchaseOrderId,
                OrderNumber          = po.OrderNumber,
                SupplierId           = po.SupplierId,
                SupplierName         = po.Supplier != null ? po.Supplier.Name : null,
                Status               = po.Status,
                OrderDate            = po.OrderDate,
                ExpectedDeliveryDate = po.ExpectedDeliveryDate,
                ItemCount            = po.Items.Count,
                TotalAmount          = po.Items.Sum(i => i.Quantity * i.UnitCost),
                CreatedAt            = po.CreatedAt,
            })
            .ToListAsync(ct);
    }

    public async Task<PurchaseOrderDetailResponse?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var po = await _db.PurchaseOrders
            .AsNoTracking()
            .Include(po => po.Supplier)
            .Include(po => po.Items)
                .ThenInclude(i => i.DrugInventory)
            .FirstOrDefaultAsync(po => po.PurchaseOrderId == id, ct);

        return po == null ? null : ToDetailResponse(po);
    }

    public async Task<PurchaseOrderDetailResponse> CreateAsync(SavePurchaseOrderRequest request, CancellationToken ct = default)
    {
        if (request.Items.Count == 0)
            throw new AppException("A purchase order must have at least one item.", 400);

        foreach (var item in request.Items)
        {
            if (item.Quantity <= 0)
                throw new AppException("Item quantity must be greater than zero.", 400);
            if (item.UnitCost < 0)
                throw new AppException("Item unit cost cannot be negative.", 400);
        }

        var orderNumber = await GenerateOrderNumberAsync(ct);

        var po = new PurchaseOrder
        {
            OrderNumber          = orderNumber,
            SupplierId           = request.SupplierId,
            Status               = PurchaseOrderStatus.Draft,
            OrderDate            = DateTime.UtcNow,
            ExpectedDeliveryDate = request.ExpectedDeliveryDate,
            Notes                = request.Notes?.Trim(),
        };

        foreach (var item in request.Items)
        {
            po.Items.Add(new PurchaseOrderItem
            {
                TenantId        = _tenantContext.TenantId,
                DrugInventoryId = item.DrugInventoryId,
                Quantity        = item.Quantity,
                QuantityReceived = 0,
                UnitCost        = item.UnitCost,
            });
        }

        _db.PurchaseOrders.Add(po);
        await _db.SaveChangesAsync(ct);

        return (await GetByIdAsync(po.PurchaseOrderId, ct))!;
    }

    public async Task<PurchaseOrderDetailResponse> UpdateAsync(Guid id, SavePurchaseOrderRequest request, CancellationToken ct = default)
    {
        var po = await _db.PurchaseOrders
            .Include(po => po.Items)
            .FirstOrDefaultAsync(po => po.PurchaseOrderId == id, ct)
            ?? throw new NotFoundException("PurchaseOrder", id);

        if (po.Status != PurchaseOrderStatus.Draft)
            throw new AppException("Only Draft purchase orders can be edited.", 400);

        if (request.Items.Count == 0)
            throw new AppException("A purchase order must have at least one item.", 400);

        po.SupplierId           = request.SupplierId;
        po.ExpectedDeliveryDate = request.ExpectedDeliveryDate;
        po.Notes                = request.Notes?.Trim();

        // Full item replace
        _db.PurchaseOrderItems.RemoveRange(po.Items);
        po.Items.Clear();

        foreach (var item in request.Items)
        {
            po.Items.Add(new PurchaseOrderItem
            {
                TenantId         = _tenantContext.TenantId,
                DrugInventoryId  = item.DrugInventoryId,
                Quantity         = item.Quantity,
                QuantityReceived = 0,
                UnitCost         = item.UnitCost,
            });
        }

        await _db.SaveChangesAsync(ct);
        return (await GetByIdAsync(po.PurchaseOrderId, ct))!;
    }

    public async Task<PurchaseOrderDetailResponse> PlaceOrderAsync(Guid id, CancellationToken ct = default)
    {
        var po = await _db.PurchaseOrders
            .FirstOrDefaultAsync(po => po.PurchaseOrderId == id, ct)
            ?? throw new NotFoundException("PurchaseOrder", id);

        if (po.Status != PurchaseOrderStatus.Draft)
            throw new AppException($"Only Draft orders can be placed. Current status: {po.Status}.", 409);

        po.Status = PurchaseOrderStatus.Ordered;
        await _db.SaveChangesAsync(ct);
        return (await GetByIdAsync(po.PurchaseOrderId, ct))!;
    }

    public async Task<PurchaseOrderDetailResponse> ReceiveGoodsAsync(Guid id, ReceiveGoodsRequest request, CancellationToken ct = default)
    {
        if (request.Items.Count == 0)
            throw new AppException("No items specified for goods receipt.", 400);

        var po = await _db.PurchaseOrders
            .Include(po => po.Items)
                .ThenInclude(i => i.DrugInventory)
            .FirstOrDefaultAsync(po => po.PurchaseOrderId == id, ct)
            ?? throw new NotFoundException("PurchaseOrder", id);

        if (po.Status != PurchaseOrderStatus.Ordered && po.Status != PurchaseOrderStatus.PartiallyReceived)
            throw new AppException($"Goods can only be received for Ordered or PartiallyReceived purchase orders. Current status: {po.Status}.", 409);

        var now    = DateTime.UtcNow;
        var userId = _currentUser.UserId;

        foreach (var incoming in request.Items)
        {
            if (incoming.QuantityReceived <= 0)
                continue;

            var lineItem = po.Items.FirstOrDefault(i => i.PurchaseOrderItemId == incoming.PurchaseOrderItemId)
                ?? throw new AppException($"Item {incoming.PurchaseOrderItemId} does not belong to this purchase order.", 400);

            var remaining = lineItem.Quantity - lineItem.QuantityReceived;
            if (incoming.QuantityReceived > remaining)
                throw new AppException(
                    $"Cannot receive {incoming.QuantityReceived} of '{lineItem.DrugInventory.Name}': only {remaining} units are pending.", 400);

            var drug     = lineItem.DrugInventory;
            var previous = drug.CurrentStock;
            drug.CurrentStock += incoming.QuantityReceived;

            lineItem.QuantityReceived += incoming.QuantityReceived;

            _db.StockMovements.Add(new StockMovement
            {
                TenantId        = _tenantContext.TenantId,
                DrugInventoryId = drug.DrugInventoryId,
                MovementType    = StockMovementType.Receive,
                Quantity        = incoming.QuantityReceived,
                PreviousStock   = previous,
                NewStock        = drug.CurrentStock,
                ReferenceId     = po.PurchaseOrderId,
                ReferenceType   = "PurchaseOrder",
                Notes           = $"Received via PO {po.OrderNumber}",
                CreatedByUserId = userId,
                CreatedAt       = now,
            });
        }

        // Determine new status
        bool allReceived = po.Items.All(i => i.QuantityReceived >= i.Quantity);
        bool anyReceived = po.Items.Any(i => i.QuantityReceived > 0);

        po.Status = allReceived ? PurchaseOrderStatus.Received :
                    anyReceived ? PurchaseOrderStatus.PartiallyReceived :
                                  po.Status;

        await _db.SaveChangesAsync(ct);
        return (await GetByIdAsync(po.PurchaseOrderId, ct))!;
    }

    public async Task<PurchaseOrderDetailResponse> CancelAsync(Guid id, CancellationToken ct = default)
    {
        var po = await _db.PurchaseOrders
            .FirstOrDefaultAsync(po => po.PurchaseOrderId == id, ct)
            ?? throw new NotFoundException("PurchaseOrder", id);

        if (po.Status != PurchaseOrderStatus.Draft && po.Status != PurchaseOrderStatus.Ordered)
            throw new AppException($"Only Draft or Ordered purchase orders can be cancelled. Current status: {po.Status}.", 409);

        po.Status = PurchaseOrderStatus.Cancelled;
        await _db.SaveChangesAsync(ct);
        return (await GetByIdAsync(po.PurchaseOrderId, ct))!;
    }

    // ── Order Number Generation ───────────────────────────────────────────────

    private async Task<string> GenerateOrderNumberAsync(CancellationToken ct)
    {
        var year   = DateTime.UtcNow.Year;
        var prefix = $"PO-{year}-";

        var lastNumber = await _db.PurchaseOrders
            .Where(po => po.OrderNumber.StartsWith(prefix))
            .OrderByDescending(po => po.OrderNumber)
            .Select(po => po.OrderNumber)
            .FirstOrDefaultAsync(ct);

        var seq = 1;
        if (lastNumber is not null &&
            int.TryParse(lastNumber[prefix.Length..], out var last))
        {
            seq = last + 1;
        }

        return $"{prefix}{seq:D5}";
    }

    // ── Projection ────────────────────────────────────────────────────────────

    private static PurchaseOrderDetailResponse ToDetailResponse(PurchaseOrder po) => new()
    {
        PurchaseOrderId      = po.PurchaseOrderId,
        OrderNumber          = po.OrderNumber,
        SupplierId           = po.SupplierId,
        SupplierName         = po.Supplier?.Name,
        SupplierPhone        = po.Supplier?.Phone,
        SupplierEmail        = po.Supplier?.Email,
        Status               = po.Status,
        OrderDate            = po.OrderDate,
        ExpectedDeliveryDate = po.ExpectedDeliveryDate,
        Notes                = po.Notes,
        TotalAmount          = po.Items.Sum(i => i.Quantity * i.UnitCost),
        CreatedAt            = po.CreatedAt,
        UpdatedAt            = po.UpdatedAt,
        Items                = po.Items.Select(i => new PurchaseOrderItemResponse
        {
            PurchaseOrderItemId = i.PurchaseOrderItemId,
            DrugInventoryId     = i.DrugInventoryId,
            DrugName            = i.DrugInventory.Name,
            DosageForm          = i.DrugInventory.DosageForm,
            Strength            = i.DrugInventory.Strength,
            Unit                = i.DrugInventory.Unit,
            Quantity            = i.Quantity,
            QuantityReceived    = i.QuantityReceived,
            QuantityPending     = i.Quantity - i.QuantityReceived,
            UnitCost            = i.UnitCost,
            TotalCost           = i.Quantity * i.UnitCost,
            IsFullyReceived     = i.QuantityReceived >= i.Quantity,
        }).ToList(),
    };
}
