using FluentValidation;
using PharmPOS.Core.DTOs.Pharmacy;

namespace PharmPOS.API.Validators;

public class SaveDrugRequestValidator : AbstractValidator<SaveDrugRequest>
{
    public SaveDrugRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Drug name is required.")
            .MaximumLength(200).WithMessage("Drug name cannot exceed 200 characters.");

        RuleFor(x => x.UnitCost)
            .GreaterThanOrEqualTo(0).WithMessage("Unit cost cannot be negative.");

        RuleFor(x => x.SellingPrice)
            .GreaterThanOrEqualTo(0).WithMessage("Selling price cannot be negative.")
            .GreaterThanOrEqualTo(x => x.UnitCost).WithMessage("Selling price should not be less than unit cost.");
            
        RuleFor(x => x.ReorderThreshold)
            .GreaterThanOrEqualTo(0).WithMessage("Reorder threshold cannot be negative.");
    }
}
