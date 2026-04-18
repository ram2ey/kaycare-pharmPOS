using PharmPOS.Core.Constants;
using PharmPOS.Core.DTOs.Pharmacy;
using PharmPOS.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace PharmPOS.API.Controllers;

[ApiController]
[Route("api/pharmacy")]
[Authorize]
public class PharmacyController : ControllerBase
{
    private readonly IDrugInventoryService    _drugs;
    private readonly IStockMovementService    _movements;
    private readonly ICSRegisterService       _csRegister;
    private readonly ICSRegisterReportService _csReport;

    public PharmacyController(
        IDrugInventoryService drugs,
        IStockMovementService movements,
        ICSRegisterService csRegister,
        ICSRegisterReportService csReport)
    {
        _drugs      = drugs;
        _movements  = movements;
        _csRegister = csRegister;
        _csReport   = csReport;
    }

    // ── Drug Inventory ────────────────────────────────────────────────────────

    /// <summary>List drugs. Admin/SuperAdmin see inactive; Pharmacists see active only.</summary>
    [HttpGet("drugs")]
    public async Task<IActionResult> GetDrugs(
        [FromQuery] bool?   activeOnly   = true,
        [FromQuery] bool?   lowStockOnly = null,
        [FromQuery] string? category     = null,
        CancellationToken   ct           = default)
    {
        var isAdmin = User.IsInRole(Roles.Admin) || User.IsInRole(Roles.SuperAdmin);
        if (!isAdmin) activeOnly = true;

        var result = await _drugs.GetAllAsync(activeOnly, lowStockOnly, category, ct);
        return Ok(result);
    }

    /// <summary>Single drug by ID.</summary>
    [HttpGet("drugs/{id:guid}")]
    public async Task<IActionResult> GetDrugById(Guid id, CancellationToken ct)
    {
        var result = await _drugs.GetByIdAsync(id, ct);
        return result == null ? NotFound() : Ok(result);
    }

    /// <summary>Create a new drug in inventory.</summary>
    [HttpPost("drugs")]
    [Authorize(Roles = $"{Roles.Admin},{Roles.SuperAdmin},{Roles.Pharmacist}")]
    [ProducesResponseType(typeof(DrugInventoryResponse), 201)]
    public async Task<IActionResult> CreateDrug([FromBody] SaveDrugRequest request, CancellationToken ct)
    {
        var result = await _drugs.CreateAsync(request, ct);
        return CreatedAtAction(nameof(GetDrugById), new { id = result.DrugInventoryId }, result);
    }

    /// <summary>Update drug details.</summary>
    [HttpPut("drugs/{id:guid}")]
    [Authorize(Roles = $"{Roles.Admin},{Roles.SuperAdmin},{Roles.Pharmacist}")]
    [ProducesResponseType(typeof(DrugInventoryResponse), 200)]
    public async Task<IActionResult> UpdateDrug(Guid id, [FromBody] SaveDrugRequest request, CancellationToken ct)
    {
        var result = await _drugs.UpdateAsync(id, request, ct);
        return Ok(result);
    }

    /// <summary>Deactivate a drug (soft delete).</summary>
    [HttpDelete("drugs/{id:guid}")]
    [Authorize(Roles = $"{Roles.Admin},{Roles.SuperAdmin}")]
    [ProducesResponseType(typeof(DrugInventoryResponse), 200)]
    public async Task<IActionResult> DeactivateDrug(Guid id, CancellationToken ct)
    {
        var result = await _drugs.DeactivateAsync(id, ct);
        return Ok(result);
    }

    // ── Stock Movements ───────────────────────────────────────────────────────

    /// <summary>Movement history for a specific drug.</summary>
    [HttpGet("drugs/{id:guid}/movements")]
    public async Task<IActionResult> GetMovements(Guid id, CancellationToken ct)
    {
        var result = await _movements.GetMovementsForDrugAsync(id, ct);
        return Ok(result);
    }

    /// <summary>Record a manual stock adjustment (Receive, AdjustAdd, AdjustDeduct, Return, Expire, WriteOff).</summary>
    [HttpPost("drugs/{id:guid}/movements")]
    [Authorize(Roles = $"{Roles.Admin},{Roles.SuperAdmin},{Roles.Pharmacist}")]
    [ProducesResponseType(typeof(StockMovementResponse), 201)]
    public async Task<IActionResult> RecordMovement(
        Guid id,
        [FromBody] RecordMovementRequest request,
        CancellationToken ct)
    {
        var result = await _movements.RecordMovementAsync(
            id,
            request.MovementType,
            request.Quantity,
            notes: request.Notes,
            ct: ct);
        return StatusCode(201, result);
    }

    // ── Reorder Alerts ────────────────────────────────────────────────────────

    /// <summary>Drugs at or below their reorder threshold.</summary>
    [HttpGet("reorder-alerts")]
    public async Task<IActionResult> GetReorderAlerts(CancellationToken ct)
    {
        var result = await _drugs.GetReorderAlertsAsync(ct);
        return Ok(result);
    }

    // ── Controlled Substance Register ─────────────────────────────────────────

    /// <summary>Controlled substance register — all CS drug movements with running balance.</summary>
    [HttpGet("cs-register")]
    [Authorize(Roles = $"{Roles.Pharmacist},{Roles.Admin},{Roles.SuperAdmin}")]
    public async Task<IActionResult> GetCSRegister(
        [FromQuery] DateOnly? from = null,
        [FromQuery] DateOnly? to   = null,
        CancellationToken ct = default)
    {
        var result = await _csRegister.GetRegisterAsync(from, to, ct);
        return Ok(result);
    }

    /// <summary>Download the controlled substance register as a PDF.</summary>
    [HttpGet("cs-register/report")]
    [Authorize(Roles = $"{Roles.Pharmacist},{Roles.Admin},{Roles.SuperAdmin}")]
    public async Task<IActionResult> GetCSRegisterReport(
        [FromQuery] DateOnly? from = null,
        [FromQuery] DateOnly? to   = null,
        CancellationToken ct = default)
    {
        var entries = await _csRegister.GetRegisterAsync(from, to, ct);
        var pdf     = await _csReport.GenerateAsync(entries, from, to, ct);
        var file    = $"cs-register-{DateTime.Now:yyyyMMdd}.pdf";
        return File(pdf, "application/pdf", file);
    }
}
