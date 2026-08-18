using System.ComponentModel.DataAnnotations;

namespace Korp.Estoque.API.Models
{
    public class Produto
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(50)]
        public string Codigo { get; set; } = string.Empty;

        [Required]
        [MaxLength(150)]
        public string Descricao { get; set; } = string.Empty;

        [Required]
        [ConcurrencyCheck]
        public int Saldo { get; set; }

        public DateTime DataCriacao { get; set; } = DateTime.UtcNow;
    }
}