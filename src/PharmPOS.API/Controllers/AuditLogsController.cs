using PharmPOS.Core.Constants;
using PharmPOS.Core.DTOs.Audit;
using PharmPOS.Core.DTOs.Common;
using PharmPOS.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace PharmPOS.API.Controllers;

[ApiController]
[Route("api/audit-logs")]
[Authorize(Roles = $"{Roles.SuperAdmin},{Roles.Admin}")]
public class AuditLogsController : ControllerBase
{
    private readonly AppDbContext _db;

    public AuditLogsController(AppDbContext db) => _db = db;

    /// <summary>
    /// Query audit logs. Filter by user, action, or date range. Results are newest-first and paginated.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<AuditLogResponse>), 200)]
    public async Task<IActionResult> Query([FromQuery] AuditLogQueryRequest req, CancellationToken ct)
    {
        var query = _db.AuditLogs.AsNoTracking();

        if (req.PatientId.HasValue)
            query = query.Where(a => a.PatientId == req.PatientId.Value);

        if (req.UserId.HasValue)
            query = query.Where(a => a.UserId == req.UserId.Value);

        if (!string.IsNullOrWhiteSpace(req.Action))
            query = query.Where(a => a.Action == req.Action);

        if (req.From.HasValue)
            query = query.Where(a => a.Timestamp >= req.From.Value);

        if (req.To.HasValue)
            query = query.Where(a => a.Timestamp <= req.To.Value);

        var total = await query.CountAsync(ct);

        var pageSize = Math.Clamp(req.PageSize, 1, 200);
        var page     = Math.Max(req.Page, 1);

        var rows = await query
            .OrderByDescending(a => a.Timestamp)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new AuditLogResponse
            {
                AuditLogId = a.AuditLogId,
                TenantId   = a.TenantId,
                UserId     = a.UserId,
                UserEmail  = a.UserEmail,
                Action     = a.Action,
                EntityType = a.EntityType,
                EntityId   = a.EntityId,
                PatientId  = a.PatientId,
                Details    = a.Details,
                IpAddress  = a.IpAddress,
                Timestamp  = a.Timestamp,
            })
            .ToListAsync(ct);

        return Ok(new PagedResult<AuditLogResponse>
        {
            Items      = rows,
            TotalCount = total,
            Page       = page,
            PageSize   = pageSize,
        });
    }
}
