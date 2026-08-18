using System.ComponentModel.DataAnnotations;

namespace Korp.Estoque.API.DTOs
{
    public class BaixarEstoqueDto
    {
        [Required(ErrorMessage = "O ID do produto é obrigatório.")]
        [Range(1, int.MaxValue, ErrorMessage = "O ID do produto deve ser maior que zero.")]
        public int ProdutoId { get; set; }

        [Required(ErrorMessage = "A quantidade é obrigatória.")]
        [Range(1, int.MaxValue, ErrorMessage = "A quantidade deve ser maior que zero.")]
        public int Quantidade { get; set; }
    }
}