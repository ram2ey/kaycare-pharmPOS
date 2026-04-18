using PharmPOS.Core.Constants;
using PharmPOS.Core.DTOs.Pharmacy;
using PharmPOS.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace PharmPOS.API.Controllers;

[ApiController]
[Route("api/pharmacy/purchase-orders")]
[Authorize]
public class PurchaseOrdersController : ControllerBase
{
    private readonly IPurchaseOrderService _orders;

    public PurchaseOrdersController(IPurchaseOrderService orders)
    {
        _orders = orders;
    }

    /// <summary>List purchase orders, optionally filtered by status or supplier.</summary>
    [HttpGet]
    [Authorize(Roles = $"{Roles.Admin},{Roles.SuperAdmin},{Roles.Pharmacist}")]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? status     = null,
        [FromQuery] Guid?   supplierId = null,
        CancellationToken   ct         = default)
    {
        return Ok(await _orders.GetAllAsync(status, supplierId, ct));
    }

    /// <summary>Single purchase order with line items.</summary>
    [HttpGet("{id:guid}")]
    [Authorize(Roles = $"{Roles.Admin},{Roles.SuperAdmin},{Roles.Pharmacist}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var result = await _orders.GetByIdAsync(id, ct);
        return result == null ? NotFound() : Ok(result);
    }

    /// <summary>Create a new purchase order (status: Draft).</summary>
    [HttpPost]
    [Authorize(Roles = $"{Roles.Admin},{Roles.SuperAdmin},{Roles.Pharmacist}")]
    [ProducesResponseType(typeof(PurchaseOrderDetailResponse), 201)]
    public async Task<IActionResult> Create([FromBody] SavePurchaseOrderRequest request, CancellationToken ct)
    {
        var result = await _orders.CreateAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = result.PurchaseOrderId }, result);
    }

    /// <summary>Update a Draft purchase order (replaces all line items).</summary>
    [HttpPut("{id:guid}")]
    [Authorize(Roles = $"{Roles.Admin},{Roles.SuperAdmin},{Roles.Pharmacist}")]
    [ProducesResponseType(typeof(PurchaseOrderDetailResponse), 200)]
    public async Task<IActionResult> Update(Guid id, [FromBody] SavePurchaseOrderRequest request, CancellationToken ct)
    {
        var result = await _orders.UpdateAsync(id, request, ct);
        return Ok(result);
    }

    /// <summary>Transition Draft → Ordered (sent to supplier).</summary>
    [HttpPost("{id:guid}/place")]
    [Authorize(Roles = $"{Roles.Admin},{Roles.SuperAdmin},{Roles.Pharmacist}")]
    [ProducesResponseType(typeof(PurchaseOrderDetailResponse), 200)]
    public async Task<IActionResult> PlaceOrder(Guid id, CancellationToken ct)
    {
        var result = await _orders.PlaceOrderAsync(id, ct);
        return Ok(result);
    }

    /// <summary>
    /// Receive goods against an Ordered or PartiallyReceived PO.
    /// Auto-creates StockMovement(Receive) per item and updates stock.
    /// </summary>
    [HttpPost("{id:guid}/receive")]
    [Authorize(Roles = $"{Roles.Admin},{Roles.SuperAdmin},{Roles.Pharmacist}")]
    [ProducesResponseType(typeof(PurchaseOrderDetailResponse), 200)]
    public async Task<IActionResult> ReceiveGoods(Guid id, [FromBody] ReceiveGoodsRequest request, CancellationToken ct)
    {
        var result = await _orders.ReceiveGoodsAsync(id, request, ct);
        return Ok(result);
    }

    /// <summary>Cancel a Draft or Ordered purchase order.</summary>
    [HttpPost("{id:guid}/cancel")]
    [Authorize(Roles = $"{Roles.Admin},{Roles.SuperAdmin}")]
    [ProducesResponseType(typeof(PurchaseOrderDetailResponse), 200)]
    public async Task<IActionResult> Cancel(Guid id, CancellationToken ct)
    {
        var result = await _orders.CancelAsync(id, ct);
        return Ok(result);
    }
}
