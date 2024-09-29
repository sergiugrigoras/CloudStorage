using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using CloudStorage.Interfaces;
using CloudStorage.Models;

namespace CloudStorage.Services;

public class GeminiService(IConfiguration configuration, HttpClient httpClient): IGeminiService
{
    private readonly HttpClient _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
    private readonly JsonSerializerOptions _serializerOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
    public async Task<GeminiResponse> SendRequestAsync(string text)
    {
        var url = configuration.GetValue<string>("GeminiAPI:Url");
        var key = configuration.GetValue<string>("GeminiAPI:Key");
        _httpClient.DefaultRequestHeaders.Accept.Add(
            new MediaTypeWithQualityHeaderValue("application/json"));
        var data = new
        {
            contents = new[]
            {
                new
                {
                    parts = new[]
                    {
                        new
                        {
                            text   
                        }
                    }
                }
            },
            /*generationConfig = new
            {
                response_mime_type = "application/json"
            }*/
        };
        var serializedData = JsonSerializer.Serialize(data);
        var requestContent = new StringContent(serializedData, Encoding.UTF8, "application/json");
        var response = await _httpClient.PostAsync($"{url}?key={key}", requestContent);
        response.EnsureSuccessStatusCode();
        var content = await response.Content.ReadAsStringAsync();
        var geminiResponse = JsonSerializer.Deserialize<GeminiResponse>(content, _serializerOptions);
        return geminiResponse;
    }
}