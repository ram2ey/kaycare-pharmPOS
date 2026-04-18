using PharmPOS.Core.Constants;
using PharmPOS.Core.DTOs.Pharmacy;
using PharmPOS.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace PharmPOS.API.Controllers;

[ApiController]
[Route("api/pharmacy/suppliers")]
[Authorize]
public class SuppliersController : ControllerBase
{
    private readonly ISupplierService _suppliers;

    public SuppliersController(ISupplierService suppliers)
    {
        _suppliers = suppliers;
    }

    /// <summary>List suppliers. Admins see inactive; others see active only.</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool? activeOnly = null, CancellationToken ct = default)
    {
        var isAdmin = User.IsInRole(Roles.Admin) || User.IsInRole(Roles.SuperAdmin);
        var filter  = isAdmin ? activeOnly : true;
        return Ok(await _suppliers.GetAllAsync(filter, ct));
    }

    /// <summary>Single supplier by ID.</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var result = await _suppliers.GetByIdAsync(id, ct);
        return result == null ? NotFound() : Ok(result);
    }

    /// <summary>Create a new supplier.</summary>
    [HttpPost]
    [Authorize(Roles = $"{Roles.Admin},{Roles.SuperAdmin},{Roles.Pharmacist}")]
    [ProducesResponseType(typeof(SupplierResponse), 201)]
    public async Task<IActionResult> Create([FromBody] SaveSupplierRequest request, CancellationToken ct)
    {
        var result = await _suppliers.CreateAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = result.SupplierId }, result);
    }

    /// <summary>Update supplier details.</summary>
    [HttpPut("{id:guid}")]
    [Authorize(Roles = $"{Roles.Admin},{Roles.SuperAdmin},{Roles.Pharmacist}")]
    [ProducesResponseType(typeof(SupplierResponse), 200)]
    public async Task<IActionResult> Update(Guid id, [FromBody] SaveSupplierRequest request, CancellationToken ct)
    {
        var result = await _suppliers.UpdateAsync(id, request, ct);
        return Ok(result);
    }

    /// <summary>Deactivate a supplier (soft delete).</summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = $"{Roles.Admin},{Roles.SuperAdmin}")]
    [ProducesResponseType(typeof(SupplierResponse), 200)]
    public async Task<IActionResult> Deactivate(Guid id, CancellationToken ct)
    {
        var result = await _suppliers.DeactivateAsync(id, ct);
        return Ok(result);
    }
}
