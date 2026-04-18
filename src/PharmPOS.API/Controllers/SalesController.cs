using PharmPOS.Core.Constants;
using PharmPOS.Core.DTOs.Pharmacy;
using PharmPOS.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace PharmPOS.API.Controllers;

[ApiController]
[Route("api/sales")]
[Authorize]
public class SalesController : ControllerBase
{
    private readonly ISaleService        _sales;
    private readonly ISaleReceiptService _receipt;

    public SalesController(ISaleService sales, ISaleReceiptService receipt)
    {
        _sales   = sales;
        _receipt = receipt;
    }

    /// <summary>List sales within a date range (defaults to last 30 days).</summary>
    [HttpGet]
    [Authorize(Roles = $"{Roles.Admin},{Roles.SuperAdmin},{Roles.Pharmacist}")]
    public async Task<IActionResult> GetAll(
        [FromQuery] DateOnly? from = null,
        [FromQuery] DateOnly? to   = null,
        CancellationToken ct = default)
    {
        return Ok(await _sales.GetAllAsync(from, to, ct));
    }

    /// <summary>Single sale with all line items.</summary>
    [HttpGet("{id:guid}")]
    [Authorize(Roles = $"{Roles.Admin},{Roles.SuperAdmin},{Roles.Pharmacist}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
        => Ok(await _sales.GetByIdAsync(id, ct));

    /// <summary>Create a new POS sale. Validates stock and deducts inventory automatically.</summary>
    [HttpPost]
    [Authorize(Roles = $"{Roles.Admin},{Roles.SuperAdmin},{Roles.Pharmacist}")]
    [ProducesResponseType(typeof(SaleDetailResponse), 201)]
    public async Task<IActionResult> Create([FromBody] CreateSaleRequest request, CancellationToken ct)
    {
        var result = await _sales.CreateAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = result.SaleId }, result);
    }

    /// <summary>Void a sale and restore stock.</summary>
    [HttpPost("{id:guid}/void")]
    [Authorize(Roles = $"{Roles.Admin},{Roles.SuperAdmin}")]
    [ProducesResponseType(typeof(SaleDetailResponse), 200)]
    public async Task<IActionResult> Void(Guid id, [FromBody] VoidSaleRequest request, CancellationToken ct)
        => Ok(await _sales.VoidAsync(id, request, ct));

    /// <summary>Daily sales summary — total revenue, per-method breakdown, top 10 drugs.</summary>
    [HttpGet("daily-summary")]
    [Authorize(Roles = $"{Roles.Admin},{Roles.SuperAdmin},{Roles.Pharmacist}")]
    public async Task<IActionResult> DailySummary([FromQuery] DateOnly? date = null, CancellationToken ct = default)
    {
        var target = date ?? DateOnly.FromDateTime(DateTime.UtcNow);
        return Ok(await _sales.GetDailySummaryAsync(target, ct));
    }

    /// <summary>Download a sale receipt as an A5 PDF.</summary>
    [HttpGet("{id:guid}/receipt")]
    [Authorize(Roles = $"{Roles.Admin},{Roles.SuperAdmin},{Roles.Pharmacist}")]
    public async Task<IActionResult> GetReceipt(Guid id, CancellationToken ct)
    {
        var pdf = await _receipt.GenerateReceiptAsync(id, ct);
        if (pdf is null) return NotFound();
        return File(pdf, "application/pdf", $"receipt-{id:N}.pdf");
    }
}
