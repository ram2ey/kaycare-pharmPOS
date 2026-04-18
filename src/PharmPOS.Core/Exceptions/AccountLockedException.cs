namespace PharmPOS.Core.Exceptions;

public class AccountLockedException : AppException
{
    public DateTime LockedUntil { get; }

    public AccountLockedException(DateTime lockedUntil)
        : base($"Account is locked until {lockedUntil:u}.", 423)
    {
        LockedUntil = lockedUntil;
    }
}
