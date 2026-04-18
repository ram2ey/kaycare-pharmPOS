namespace PharmPOS.Core.Exceptions;

public class NotFoundException : AppException
{
    public NotFoundException(string entityName, object id)
        : base($"{entityName} '{id}' was not found.", 404) { }
}
