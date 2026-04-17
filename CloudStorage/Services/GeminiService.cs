using CloudStorage.Interfaces;
using CloudStorage.Models;

namespace CloudStorage.Services;

public class GeminiService(GeminiClient geminiClient) : IGeminiService
{
    public Task<GeminiResponse> SendRequestAsync(string text) =>
        geminiClient.SendRequestAsync(text);
}