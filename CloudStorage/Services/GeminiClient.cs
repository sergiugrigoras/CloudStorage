using System.Text;
using System.Text.Json;
using CloudStorage.Models;

namespace CloudStorage.Services;

public class GeminiClient(HttpClient httpClient)
{
    private readonly JsonSerializerOptions _serializerOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    public async Task<GeminiResponse> SendRequestAsync(string text)
    {
        var data = new
        {
            contents = new[]
            {
                new
                {
                    parts = new[] { new { text } }
                }
            }
        };

        var requestContent = new StringContent(
            JsonSerializer.Serialize(data), Encoding.UTF8, "application/json");

        var response = await httpClient.PostAsync("", requestContent);
        response.EnsureSuccessStatusCode();

        var content = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<GeminiResponse>(content, _serializerOptions);
    }
}