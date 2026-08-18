namespace Korp.Estoque.API.DTOs
{
    public class ApiResponse<T>
    {
        public int StatusCode { get; set; }
        public string Message { get; set; } = string.Empty;
        public T? Data { get; set; }
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;

        public ApiResponse(int statusCode, string message, T? data)
        {
            StatusCode = statusCode;
            Message = message;
            Data = data;
        }
    }

    public static class ApiResponse
    {
        public static ApiResponse<T> Ok<T>(string message, T data) =>
            new(200, message, data);

        public static ApiResponse<object> Ok(string message) =>
            new(200, message, null);

        public static ApiResponse<object> Created(string message, object data) =>
            new(201, message, data);

        public static ApiResponse<object> Error(int statusCode, string message) =>
            new(statusCode, message, null);
    }
}