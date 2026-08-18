using FluentValidation;

namespace Korp.Faturamento.API.DTOs
{
    public class CriarNotaFiscalDtoValidator : AbstractValidator<CriarNotaFiscalDto>
    {
        public CriarNotaFiscalDtoValidator()
        {
            RuleFor(n => n.Itens)
                .NotNull().WithMessage("A nota deve conter pelo menos um item.")
                .NotEmpty().WithMessage("A nota deve conter pelo menos um item.")
                .Must(itens => itens.Count <= 50).WithMessage("A nota não pode exceder 50 itens.");

            RuleForEach(n => n.Itens)
                .SetValidator(new ItemNotaFiscalDtoValidator());
        }
    }

    public class ItemNotaFiscalDtoValidator : AbstractValidator<ItemNotaFiscalDto>
    {
        public ItemNotaFiscalDtoValidator()
        {
            RuleFor(i => i.ProdutoId)
                .GreaterThan(0).WithMessage("O ID do produto deve ser maior que zero.");

            RuleFor(i => i.Quantidade)
                .GreaterThan(0).WithMessage("A quantidade deve ser maior que zero.");
        }
    }
}