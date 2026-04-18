using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using PharmPOS.Core.Interfaces;
using Microsoft.AspNetCore.Http;

namespace PharmPOS.Infrastructure.Services;

public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ITenantContext _tenantContext;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor, ITenantContext tenantContext)
    {
        _httpContextAccessor = httpContextAccessor;
        _tenantContext = tenantContext;
    }

    private ClaimsPrincipal? User => _httpContextAccessor.HttpContext?.User;

    public Guid UserId =>
        Guid.TryParse(User?.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;

    public Guid   TenantId => _tenantContext.TenantId;
    public string Email    => User?.FindFirstValue(JwtRegisteredClaimNames.Email)
                              ?? User?.FindFirstValue(ClaimTypes.Email)
                              ?? string.Empty;
    public string Role     => User?.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
    public bool IsAuthenticated => User?.Identity?.IsAuthenticated ?? false;
}
