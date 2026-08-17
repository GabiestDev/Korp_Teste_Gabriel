using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace Korp.Faturamento.API.Models
{
    public class NotaFiscalItem
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int ProdutoId { get; set; } 

        [Required]
        public int Quantidade { get; set; }

        [Required]
        public int NotaFiscalId { get; set; }

        [JsonIgnore] 
        public NotaFiscal NotaFiscal { get; set; } = null!;
    }
}
