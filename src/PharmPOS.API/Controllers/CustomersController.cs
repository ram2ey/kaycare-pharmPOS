using PharmPOS.Core.Constants;
using PharmPOS.Core.DTOs.Pharmacy;
using PharmPOS.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace PharmPOS.API.Controllers;

[ApiController]
[Route("api/customers")]
[Authorize]
public class CustomersController : ControllerBase
{
    private readonly ICustomerService _customers;

    public CustomersController(ICustomerService customers)
    {
        _customers = customers;
    }

    /// <summary>List active customers, optionally filtered by name/phone/email.</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? search = null, CancellationToken ct = default)
        => Ok(await _customers.GetAllAsync(search, ct));

    /// <summary>Single customer by ID.</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
        => Ok(await _customers.GetByIdAsync(id, ct));

    /// <summary>Create a new customer.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(CustomerResponse), 201)]
    public async Task<IActionResult> Create([FromBody] SaveCustomerRequest request, CancellationToken ct)
    {
        var result = await _customers.CreateAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = result.CustomerId }, result);
    }

    /// <summary>Update customer details.</summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(CustomerResponse), 200)]
    public async Task<IActionResult> Update(Guid id, [FromBody] SaveCustomerRequest request, CancellationToken ct)
        => Ok(await _customers.UpdateAsync(id, request, ct));

    /// <summary>Deactivate a customer (soft delete). Admin/SuperAdmin only.</summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = $"{Roles.Admin},{Roles.SuperAdmin}")]
    public async Task<IActionResult> Deactivate(Guid id, CancellationToken ct)
    {
        await _customers.DeactivateAsync(id, ct);
        return NoContent();
    }
}
