using System.ComponentModel.DataAnnotations;

namespace Korp.Estoque.API.DTOs
{
    public class CadastrarProdutoDto
    {
        [Required(ErrorMessage = "O código é obrigatório.")]
        [MaxLength(50, ErrorMessage = "O código deve ter no máximo 50 caracteres.")]
        public string Codigo { get; set; } = string.Empty;

        [Required(ErrorMessage = "A descrição é obrigatória.")]
        [MaxLength(150, ErrorMessage = "A descrição deve ter no máximo 150 caracteres.")]
        public string Descricao { get; set; } = string.Empty;

        [Required(ErrorMessage = "O saldo é obrigatório.")]
        [Range(0, int.MaxValue, ErrorMessage = "O saldo não pode ser negativo.")]
        public int Saldo { get; set; }
    }
}