namespace PharmPOS.Core.Exceptions;

public class UnauthorizedException : AppException
{
    public UnauthorizedException(string message = "Invalid credentials.")
        : base(message, 401) { }
}
