using PharmPOS.Core.Constants;
using PharmPOS.Core.DTOs.Pharmacy;
using PharmPOS.Core.Entities;
using PharmPOS.Core.Exceptions;
using PharmPOS.Core.Interfaces;
using PharmPOS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace PharmPOS.Infrastructure.Services;

public class SaleService : ISaleService
{
    private readonly AppDbContext        _db;
    private readonly ITenantContext      _tenantContext;
    private readonly ICurrentUserService _currentUser;

    public SaleService(AppDbContext db, ITenantContext tenantContext, ICurrentUserService currentUser)
    {
        _db            = db;
        _tenantContext = tenantContext;
        _currentUser   = currentUser;
    }

    public async Task<List<SaleSummaryResponse>> GetAllAsync(DateOnly? from, DateOnly? to, CancellationToken ct)
    {
        var fromDt = from.HasValue ? from.Value.ToDateTime(TimeOnly.MinValue) : DateTime.UtcNow.Date.AddDays(-30);
        var toDt   = to.HasValue   ? to.Value.ToDateTime(TimeOnly.MaxValue)   : DateTime.UtcNow.Date.AddDays(1);

        return await _db.Sales
            .AsNoTracking()
            .Include(s => s.SoldBy)
            .Include(s => s.Items)
            .Where(s => s.SaleDate >= fromDt && s.SaleDate <= toDt)
            .OrderByDescending(s => s.SaleDate)
            .Select(s => new SaleSummaryResponse
            {
                SaleId        = s.SaleId,
                SaleNumber    = s.SaleNumber,
                CustomerName  = s.CustomerName,
                PaymentMethod = s.PaymentMethod,
                TotalAmount   = s.TotalAmount,
                PaidAmount    = s.PaidAmount,
                IsVoided      = s.IsVoided,
                SoldByName    = s.SoldBy.FirstName + " " + s.SoldBy.LastName,
                SaleDate      = s.SaleDate,
                ItemCount     = s.Items.Count,
            })
            .ToListAsync(ct);
    }

    public async Task<SaleDetailResponse> GetByIdAsync(Guid saleId, CancellationToken ct)
    {
        var sale = await _db.Sales
            .Include(s => s.SoldBy)
            .Include(s => s.Items)
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.SaleId == saleId, ct)
            ?? throw new NotFoundException("Sale", saleId);

        return ToDetailResponse(sale);
    }

    public async Task<SaleDetailResponse> CreateAsync(CreateSaleRequest request, CancellationToken ct)
    {
        if (!PaymentMethod.All.Contains(request.PaymentMethod))
            throw new AppException($"Invalid payment method '{request.PaymentMethod}'.", 400);

        if (request.Items.Count == 0)
            throw new AppException("A sale must have at least one item.", 400);

        // Load all requested drugs in one query
        var drugIds = request.Items.Select(i => i.DrugInventoryId).ToList();
        var drugs   = await _db.DrugInventory
            .Where(d => drugIds.Contains(d.DrugInventoryId))
            .ToListAsync(ct);

        var drugMap = drugs.ToDictionary(d => d.DrugInventoryId);

        // Validate stock
        foreach (var item in request.Items)
        {
            if (!drugMap.TryGetValue(item.DrugInventoryId, out var drug))
                throw new NotFoundException("DrugInventory", item.DrugInventoryId);

            if (!drug.IsActive)
                throw new AppException($"'{drug.Name}' is no longer active.", 400);

            if (item.Quantity <= 0)
                throw new AppException($"Quantity for '{drug.Name}' must be greater than zero.", 400);

            if (drug.CurrentStock < item.Quantity)
                throw new AppException($"Insufficient stock for '{drug.Name}': {drug.CurrentStock} available, {item.Quantity} requested.", 400);
        }

        // Resolve customer name
        string customerName = "Walk-in";
        if (request.CustomerId.HasValue)
        {
            var customer = await _db.Customers
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.CustomerId == request.CustomerId.Value, ct)
                ?? throw new NotFoundException("Customer", request.CustomerId.Value);
            customerName = customer.Name;
        }
        else if (!string.IsNullOrWhiteSpace(request.CustomerName))
        {
            customerName = request.CustomerName.Trim();
        }

        // Build sale items and compute totals
        var saleItems = request.Items.Select(item =>
        {
            var drug  = drugMap[item.DrugInventoryId];
            var total = drug.SellingPrice * item.Quantity;
            return new SaleItem
            {
                TenantId        = _tenantContext.TenantId,
                DrugInventoryId = drug.DrugInventoryId,
                DrugName        = drug.Name,
                DosageForm      = drug.DosageForm,
                Strength        = drug.Strength,
                Quantity        = item.Quantity,
                UnitPrice       = drug.SellingPrice,
                TotalPrice      = total,
            };
        }).ToList();

        var totalAmount    = saleItems.Sum(i => i.TotalPrice);
        var discountAmount = Math.Max(0, request.DiscountAmount);
        var netAmount      = totalAmount - discountAmount;
        var change         = Math.Max(0, request.PaidAmount - netAmount);

        // Generate sale number
        var year  = DateTime.UtcNow.Year;
        var count = await _db.Sales.CountAsync(s => s.SaleDate.Year == year, ct);
        var saleNumber = $"SAL-{year}-{(count + 1):D5}";

        var sale = new Sale
        {
            TenantId       = _tenantContext.TenantId,
            SaleNumber     = saleNumber,
            CustomerId     = request.CustomerId,
            CustomerName   = customerName,
            PaymentMethod  = request.PaymentMethod,
            TotalAmount    = totalAmount,
            DiscountAmount = discountAmount,
            PaidAmount     = request.PaidAmount,
            Change         = change,
            Notes          = request.Notes?.Trim(),
            IsVoided       = false,
            SoldByUserId   = _currentUser.UserId,
            SaleDate       = DateTime.UtcNow,
            CreatedAt      = DateTime.UtcNow,
            UpdatedAt      = DateTime.UtcNow,
            Items          = saleItems,
        };

        _db.Sales.Add(sale);

        // Deduct stock and record movements
        var now = DateTime.UtcNow;
        foreach (var item in request.Items)
        {
            var drug     = drugMap[item.DrugInventoryId];
            var previous = drug.CurrentStock;
            drug.CurrentStock -= item.Quantity;

            _db.StockMovements.Add(new StockMovement
            {
                TenantId        = _tenantContext.TenantId,
                DrugInventoryId = drug.DrugInventoryId,
                MovementType    = StockMovementType.Sale,
                Quantity        = item.Quantity,
                PreviousStock   = previous,
                NewStock        = drug.CurrentStock,
                ReferenceType   = "Sale",
                Notes           = $"POS sale {saleNumber}",
                CreatedByUserId = _currentUser.UserId,
                CreatedAt       = now,
            });
        }

        await _db.SaveChangesAsync(ct);

        // Reload with navigation for response
        var created = await _db.Sales
            .Include(s => s.SoldBy)
            .Include(s => s.Items)
            .AsNoTracking()
            .FirstAsync(s => s.SaleId == sale.SaleId, ct);

        return ToDetailResponse(created);
    }

    public async Task<SaleDetailResponse> VoidAsync(Guid saleId, VoidSaleRequest request, CancellationToken ct)
    {
        var sale = await _db.Sales
            .Include(s => s.Items)
            .Include(s => s.SoldBy)
            .FirstOrDefaultAsync(s => s.SaleId == saleId, ct)
            ?? throw new NotFoundException("Sale", saleId);

        if (sale.IsVoided)
            throw new AppException("Sale is already voided.", 400);

        if (string.IsNullOrWhiteSpace(request.Reason))
            throw new AppException("A void reason is required.", 400);

        sale.IsVoided   = true;
        sale.VoidReason = request.Reason.Trim();
        sale.UpdatedAt  = DateTime.UtcNow;

        // Restore stock for each item
        var drugIds = sale.Items
            .Where(i => i.DrugInventoryId.HasValue)
            .Select(i => i.DrugInventoryId!.Value)
            .ToList();

        var drugs = await _db.DrugInventory
            .Where(d => drugIds.Contains(d.DrugInventoryId))
            .ToListAsync(ct);

        var drugMap = drugs.ToDictionary(d => d.DrugInventoryId);
        var now     = DateTime.UtcNow;

        foreach (var item in sale.Items.Where(i => i.DrugInventoryId.HasValue))
        {
            if (!drugMap.TryGetValue(item.DrugInventoryId!.Value, out var drug))
                continue;

            var previous = drug.CurrentStock;
            drug.CurrentStock += item.Quantity;

            _db.StockMovements.Add(new StockMovement
            {
                TenantId        = _tenantContext.TenantId,
                DrugInventoryId = drug.DrugInventoryId,
                MovementType    = StockMovementType.Return,
                Quantity        = item.Quantity,
                PreviousStock   = previous,
                NewStock        = drug.CurrentStock,
                ReferenceId     = saleId,
                ReferenceType   = "SaleVoid",
                Notes           = $"Void of {sale.SaleNumber}: {request.Reason}",
                CreatedByUserId = _currentUser.UserId,
                CreatedAt       = now,
            });
        }

        await _db.SaveChangesAsync(ct);
        return ToDetailResponse(sale);
    }

    public async Task<DailySalesSummaryResponse> GetDailySummaryAsync(DateOnly date, CancellationToken ct)
    {
        var from = date.ToDateTime(TimeOnly.MinValue);
        var to   = date.ToDateTime(TimeOnly.MaxValue);

        var sales = await _db.Sales
            .Include(s => s.Items)
            .AsNoTracking()
            .Where(s => !s.IsVoided && s.SaleDate >= from && s.SaleDate <= to)
            .ToListAsync(ct);

        var topDrugs = sales
            .SelectMany(s => s.Items)
            .GroupBy(i => i.DrugName)
            .Select(g => new TopDrugResponse
            {
                DrugName      = g.Key,
                TotalQuantity = g.Sum(i => i.Quantity),
                TotalRevenue  = g.Sum(i => i.TotalPrice),
            })
            .OrderByDescending(d => d.TotalRevenue)
            .Take(10)
            .ToList();

        return new DailySalesSummaryResponse
        {
            Date               = date,
            TotalSales         = sales.Count,
            TotalRevenue       = sales.Sum(s => s.TotalAmount - s.DiscountAmount),
            CashRevenue        = sales.Where(s => s.PaymentMethod == PaymentMethod.Cash).Sum(s => s.TotalAmount - s.DiscountAmount),
            CardRevenue        = sales.Where(s => s.PaymentMethod == PaymentMethod.Card).Sum(s => s.TotalAmount - s.DiscountAmount),
            MobileMoneyRevenue = sales.Where(s => s.PaymentMethod == PaymentMethod.MobileMoney).Sum(s => s.TotalAmount - s.DiscountAmount),
            InsuranceRevenue   = sales.Where(s => s.PaymentMethod == PaymentMethod.Insurance).Sum(s => s.TotalAmount - s.DiscountAmount),
            TopDrugs           = topDrugs,
        };
    }

    private static SaleDetailResponse ToDetailResponse(Sale s) => new()
    {
        SaleId         = s.SaleId,
        SaleNumber     = s.SaleNumber,
        CustomerId     = s.CustomerId,
        CustomerName   = s.CustomerName,
        PaymentMethod  = s.PaymentMethod,
        TotalAmount    = s.TotalAmount,
        DiscountAmount = s.DiscountAmount,
        PaidAmount     = s.PaidAmount,
        Change         = s.Change,
        Notes          = s.Notes,
        IsVoided       = s.IsVoided,
        VoidReason     = s.VoidReason,
        SoldByName     = s.SoldBy is null ? string.Empty : $"{s.SoldBy.FirstName} {s.SoldBy.LastName}",
        SaleDate       = s.SaleDate,
        Items          = s.Items.Select(i => new SaleItemResponse
        {
            SaleItemId      = i.SaleItemId,
            DrugInventoryId = i.DrugInventoryId,
            DrugName        = i.DrugName,
            DosageForm      = i.DosageForm,
            Strength        = i.Strength,
            Quantity        = i.Quantity,
            UnitPrice       = i.UnitPrice,
            TotalPrice      = i.TotalPrice,
        }).ToList(),
    };
}
