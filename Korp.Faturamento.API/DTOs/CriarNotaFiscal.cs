using System.ComponentModel.DataAnnotations;

namespace Korp.Faturamento.API.DTOs
{
    public class CriarNotaFiscalDto
    {
        [Required]
        [MinLength(1, ErrorMessage = "A nota deve conter pelo menos um item.")]
        public List<ItemNotaFiscalDto> Itens { get; set; } = new();
    }

    public class ItemNotaFiscalDto
    {
        [Required]
        public int ProdutoId { get; set; }

        [Required]
        [Range(1, int.MaxValue, ErrorMessage = "A quantidade deve ser maior que zero.")]
        public int Quantidade { get; set; }
    }
}