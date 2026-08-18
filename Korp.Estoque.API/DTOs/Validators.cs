using FluentValidation;

namespace Korp.Estoque.API.DTOs
{
    public class CadastrarProdutoDtoValidator : AbstractValidator<CadastrarProdutoDto>
    {
        public CadastrarProdutoDtoValidator()
        {
            RuleFor(p => p.Codigo)
                .NotEmpty().WithMessage("O código é obrigatório.")
                .MaximumLength(50).WithMessage("O código deve ter no máximo 50 caracteres.");

            RuleFor(p => p.Descricao)
                .NotEmpty().WithMessage("A descrição é obrigatória.")
                .MaximumLength(150).WithMessage("A descrição deve ter no máximo 150 caracteres.");

            RuleFor(p => p.Saldo)
                .GreaterThanOrEqualTo(0).WithMessage("O saldo não pode ser negativo.");
        }
    }

    public class BaixarEstoqueDtoValidator : AbstractValidator<BaixarEstoqueDto>
    {
        public BaixarEstoqueDtoValidator()
        {
            RuleFor(p => p.ProdutoId)
                .GreaterThan(0).WithMessage("O ID do produto deve ser maior que zero.");

            RuleFor(p => p.Quantidade)
                .GreaterThan(0).WithMessage("A quantidade deve ser maior que zero.");
        }
    }

    public class LoginDtoValidator : AbstractValidator<LoginDto>
    {
        public LoginDtoValidator()
        {
            RuleFor(l => l.Username)
                .NotEmpty().WithMessage("O usuário é obrigatório.")
                .MaximumLength(50).WithMessage("O usuário deve ter no máximo 50 caracteres.");

            RuleFor(l => l.Senha)
                .NotEmpty().WithMessage("A senha é obrigatória.");
        }
    }
}