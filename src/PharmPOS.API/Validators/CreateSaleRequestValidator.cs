using FluentValidation;
using PharmPOS.Core.DTOs.Pharmacy;

namespace PharmPOS.API.Validators;

public class CreateSaleRequestValidator : AbstractValidator<CreateSaleRequest>
{
    public CreateSaleRequestValidator()
    {
        RuleFor(x => x.PaymentMethod)
            .NotEmpty().WithMessage("Payment method is required.")
            .Must(m => new[] { "Cash", "Card", "MobileMoney", "Insurance" }.Contains(m))
            .WithMessage("Invalid payment method.");

        RuleFor(x => x.PaidAmount)
            .GreaterThanOrEqualTo(0).WithMessage("Paid amount cannot be negative.");

        RuleFor(x => x.Items)
            .NotEmpty().WithMessage("Sale must contain at least one item.");

        RuleForEach(x => x.Items).SetValidator(new CreateSaleItemRequestValidator());
    }
}

public class CreateSaleItemRequestValidator : AbstractValidator<CreateSaleItemRequest>
{
    public CreateSaleItemRequestValidator()
    {
        RuleFor(x => x.DrugInventoryId)
            .NotEmpty().WithMessage("Drug inventory ID is required.");

        RuleFor(x => x.Quantity)
            .GreaterThan(0).WithMessage("Quantity must be greater than zero.");
    }
}
