using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Korp.Faturamento.API.Models
{
    public class NotaFiscal
    {
        [Key]
        public int Id { get; set; }

        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int NumeroSequencial { get; set; }

        [Required]
        public StatusNota Status { get; set; } = StatusNota.Aberta; 
        public List<NotaFiscalItem> Itens { get; set; } = new();

        public DateTime DataCriacao { get; set; } = DateTime.UtcNow;
    }
}
