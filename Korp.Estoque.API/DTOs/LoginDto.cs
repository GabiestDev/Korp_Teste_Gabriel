using System.ComponentModel.DataAnnotations;

namespace Korp.Estoque.API.DTOs
{
    public class LoginDto
    {
        [Required(ErrorMessage = "O usuário é obrigatório.")]
        public string Username { get; set; } = string.Empty;

        [Required(ErrorMessage = "A senha é obrigatória.")]
        public string Senha { get; set; } = string.Empty;
    }
}