using PharmPOS.Core.DTOs.Pharmacy;

namespace PharmPOS.Core.Interfaces;

public interface IPurchaseOrderService
{
    Task<List<PurchaseOrderSummaryResponse>> GetAllAsync(string? status = null, Guid? supplierId = null, CancellationToken ct = default);
    Task<PurchaseOrderDetailResponse?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<PurchaseOrderDetailResponse> CreateAsync(SavePurchaseOrderRequest request, CancellationToken ct = default);
    Task<PurchaseOrderDetailResponse> UpdateAsync(Guid id, SavePurchaseOrderRequest request, CancellationToken ct = default);

    /// <summary>Transition Draft → Ordered.</summary>
    Task<PurchaseOrderDetailResponse> PlaceOrderAsync(Guid id, CancellationToken ct = default);

    /// <summary>
    /// Record goods received for one or more line items.
    /// Auto-creates StockMovement(Receive) per item and updates status
    /// to PartiallyReceived or Received accordingly.
    /// </summary>
    Task<PurchaseOrderDetailResponse> ReceiveGoodsAsync(Guid id, ReceiveGoodsRequest request, CancellationToken ct = default);

    /// <summary>Transition Draft/Ordered → Cancelled.</summary>
    Task<PurchaseOrderDetailResponse> CancelAsync(Guid id, CancellationToken ct = default);
}
