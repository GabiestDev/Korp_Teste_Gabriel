using System;
using System.ComponentModel.DataAnnotations;

namespace Korp.Estoque.API.Models
{
    public class IdempotencyEntry
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(200)]
        public string Key { get; set; } = string.Empty;

        [Required]
        [MaxLength(200)]
        public string Route { get; set; } = string.Empty;

        [MaxLength(2000)]
        public string RequestHash { get; set; } = string.Empty;

        public string RequestHeaders { get; set; } = string.Empty;

        public int ResponseStatus { get; set; }

        public string ResponseBody { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? ExpiresAt { get; set; }
    }
}