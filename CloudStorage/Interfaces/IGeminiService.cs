using CloudStorage.Models;

namespace CloudStorage.Interfaces;

public interface IGeminiService
{
    Task<GeminiResponse> SendRequestAsync(string text);
}