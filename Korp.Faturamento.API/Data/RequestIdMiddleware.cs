namespace Korp.Faturamento.API.Data
{
    /// <summary>
    /// Gera/aceita um request id e o adiciona ao LogContext e à resposta,
    /// permitindo correlacionar logs entre o frontend e os dois microsserviços.
    /// </summary>
    public class RequestIdMiddleware
    {
        private readonly RequestDelegate _next;

        public RequestIdMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            var requestId = context.Request.Headers["X-Request-Id"].FirstOrDefault();
            if (string.IsNullOrWhiteSpace(requestId))
            {
                requestId = Guid.NewGuid().ToString("N");
            }

            context.Response.Headers["X-Request-Id"] = requestId;
            Serilog.Context.LogContext.PushProperty("RequestId", requestId);

            try
            {
                await _next(context);
            }
            finally
            {
                Serilog.Context.LogContext.Reset();
            }
        }
    }

    public static class RequestIdMiddlewareExtensions
    {
        public static IApplicationBuilder UseRequestId(this IApplicationBuilder builder) =>
            builder.UseMiddleware<RequestIdMiddleware>();
    }
}