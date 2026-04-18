using PharmPOS.Core.Constants;
using PharmPOS.Core.DTOs.Tenants;
using PharmPOS.Core.Exceptions;
using PharmPOS.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace PharmPOS.API.Controllers;

[ApiController]
[Route("api/tenants")]
[Authorize(Roles = Roles.SuperAdmin)]
public class TenantsController(ITenantService tenants) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
        => Ok(await tenants.GetAllAsync(ct));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var tenant = await tenants.GetByIdAsync(id, ct);
        return tenant is null ? NotFound() : Ok(tenant);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTenantRequest req, CancellationToken ct)
    {
        try
        {
            var result = await tenants.CreateAsync(req, ct);
            return CreatedAtAction(nameof(GetById), new { id = result.TenantId }, result);
        }
        catch (ConflictException ex) { return Conflict(new { message = ex.Message }); }
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTenantRequest req, CancellationToken ct)
    {
        try   { return Ok(await tenants.UpdateAsync(id, req, ct)); }
        catch (NotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    [HttpPost("{id:guid}/activate")]
    public async Task<IActionResult> Activate(Guid id, CancellationToken ct)
    {
        try   { return Ok(await tenants.SetActiveAsync(id, true, ct)); }
        catch (NotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    [HttpPost("{id:guid}/deactivate")]
    public async Task<IActionResult> Deactivate(Guid id, CancellationToken ct)
    {
        try   { return Ok(await tenants.SetActiveAsync(id, false, ct)); }
        catch (NotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }
}
