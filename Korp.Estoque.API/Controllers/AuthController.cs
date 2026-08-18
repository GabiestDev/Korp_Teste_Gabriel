using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Korp.Estoque.API.DTOs;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;

namespace Korp.Estoque.API.Controllers
{
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/[controller]")]
    [AllowAnonymous]
    public class AuthController : ControllerBase
    {
        private readonly IConfiguration _config;
        private readonly ILogger<AuthController> _logger;

        public AuthController(IConfiguration config, ILogger<AuthController> logger)
        {
            _config = config;
            _logger = logger;
        }

        [HttpPost("login")]
        public IActionResult Login([FromBody] LoginDto dto)
        {
            var validUser = _config.GetValue<string>("Auth:Username") ?? "gabriel";
            var validPass = _config.GetValue<string>("Auth:Password") ?? "senha123";

            if (string.IsNullOrWhiteSpace(dto.Username) || string.IsNullOrWhiteSpace(dto.Senha))
                return BadRequest(ApiResponse.Error(400, "Informe usuário e senha para entrar."));

            if (dto.Username.Trim() != validUser || dto.Senha != validPass)
                return Unauthorized(ApiResponse.Error(401, "Usuário ou senha inválidos."));

            var token = GerarToken(dto.Username.Trim());

            return Ok(ApiResponse.Ok("Login realizado com sucesso.", new
            {
                token,
                username = dto.Username.Trim()
            }));
        }

        private string GerarToken(string username)
        {
            var key = _config.GetValue<string>("Jwt:Key")
                ?? "korp-dev-secret-chave-segura-para-assinatura-jwt-2026";

            var claims = new[]
            {
                new Claim(ClaimTypes.Name, username),
                new Claim(ClaimTypes.NameIdentifier, username),
                new Claim(JwtRegisteredClaimNames.Sub, username),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            var creds = new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
                SecurityAlgorithms.HmacSha256);

            var expires = TimeSpan.FromHours(_config.GetValue<int?>("Jwt:ExpiresHours") ?? 8);

            var token = new JwtSecurityToken(
                issuer: _config.GetValue<string>("Jwt:Issuer") ?? "Korp",
                audience: _config.GetValue<string>("Jwt:Audience") ?? "Korp-Angular",
                claims: claims,
                expires: DateTime.UtcNow.Add(expires),
                signingCredentials: creds);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}