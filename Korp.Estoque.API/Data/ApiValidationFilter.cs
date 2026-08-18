using Korp.Estoque.API.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Korp.Estoque.API.Data
{
    /// <summary>
    /// Formata erros de validação (DataAnnotations/FluentValidation) no mesmo envelope
    /// de resposta usado pelos controllers, para o frontend exibir a mensagem.
    /// </summary>
    public class ApiValidationFilter : IAsyncActionFilter
    {
        public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
        {
            if (!context.ModelState.IsValid)
            {
                var erros = context.ModelState
                    .Where(e => e.Value?.Errors.Count > 0)
                    .SelectMany(e => e.Value!.Errors)
                    .Select(e => e.ErrorMessage)
                    .Where(m => !string.IsNullOrWhiteSpace(m))
                    .ToList();

                var mensagem = erros.Count > 0
                    ? string.Join(" ", erros)
                    : "Dados inválidos.";

                context.Result = new BadRequestObjectResult(ApiResponse.Error(400, mensagem));
                return;
            }

            await next();
        }
    }
}