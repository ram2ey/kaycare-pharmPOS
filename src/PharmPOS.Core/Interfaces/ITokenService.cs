using PharmPOS.Core.Entities;

namespace PharmPOS.Core.Interfaces;

public interface ITokenService
{
    string GenerateToken(User user, string roleName);
}
