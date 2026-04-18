using PharmPOS.Core.DTOs.Users;
using PharmPOS.Core.Interfaces;
using PharmPOS.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace PharmPOS.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly AppDbContext            _db;
    private readonly IUserManagementService  _users;

    public UsersController(AppDbContext db, IUserManagementService users)
    {
        _db    = db;
        _users = users;
    }

    /// <summary>List users. Admin/SuperAdmin get full UserResponse; other roles get lightweight dropdown.</summary>
    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? role,
        [FromQuery] bool includeInactive = false,
        CancellationToken ct = default)
    {
        var isAdmin = User.IsInRole("Admin") || User.IsInRole("SuperAdmin");
        if (!isAdmin)
        {
            var query = _db.Users
                .Include(u => u.Role)
                .Where(u => u.IsActive);

            if (!string.IsNullOrWhiteSpace(role))
                query = query.Where(u => u.Role.RoleName == role);

            var simple = await query
                .OrderBy(u => u.LastName).ThenBy(u => u.FirstName)
                .Select(u => new
                {
                    u.UserId,
                    FullName = u.FirstName + " " + u.LastName,
                    u.Email,
                    Role     = u.Role.RoleName,
                    u.Department,
                    u.LicenseNumber,
                })
                .ToListAsync(ct);

            return Ok(simple);
        }

        return Ok(await _users.GetAllAsync(includeInactive, role, ct));
    }

    /// <summary>Get a single user by ID (Admin/SuperAdmin).</summary>
    [HttpGet("{id:guid}")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
        => Ok(await _users.GetByIdAsync(id, ct));

    /// <summary>Create a new staff user (Admin/SuperAdmin).</summary>
    [HttpPost]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> Create([FromBody] CreateUserRequest request, CancellationToken ct)
    {
        var user = await _users.CreateAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = user.UserId }, user);
    }

    /// <summary>Update a user's profile and role (Admin/SuperAdmin).</summary>
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateUserRequest request, CancellationToken ct)
        => Ok(await _users.UpdateAsync(id, request, ct));

    /// <summary>Deactivate a user (Admin/SuperAdmin).</summary>
    [HttpPut("{id:guid}/deactivate")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> Deactivate(Guid id, CancellationToken ct)
    {
        await _users.DeactivateAsync(id, ct);
        return NoContent();
    }

    /// <summary>Reactivate a user (Admin/SuperAdmin).</summary>
    [HttpPut("{id:guid}/reactivate")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> Reactivate(Guid id, CancellationToken ct)
    {
        await _users.ReactivateAsync(id, ct);
        return NoContent();
    }

    /// <summary>Reset a user's password and force change on next login (Admin/SuperAdmin).</summary>
    [HttpPut("{id:guid}/reset-password")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> ResetPassword(Guid id, [FromBody] ResetPasswordRequest request, CancellationToken ct)
    {
        await _users.ResetPasswordAsync(id, request, ct);
        return NoContent();
    }

    /// <summary>List all departments in use, with staff count (Admin/SuperAdmin).</summary>
    [HttpGet("departments")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> GetDepartments(CancellationToken ct)
        => Ok(await _users.GetDepartmentsAsync(ct));

    /// <summary>Rename a department across all users (Admin/SuperAdmin).</summary>
    [HttpPut("departments/rename")]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public async Task<IActionResult> RenameDepartment([FromBody] RenameDepartmentRequest request, CancellationToken ct)
    {
        await _users.RenameDepartmentAsync(request, ct);
        return NoContent();
    }
}
