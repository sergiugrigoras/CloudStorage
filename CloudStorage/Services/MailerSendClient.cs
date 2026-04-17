using System.Net.Http.Headers;
using System.Net.Mail;
using System.Text.Json;

namespace CloudStorage.Services;

public class MailerSendClient(HttpClient httpClient)
{
    public async Task SendEmailAsync(string fromAddress, MailAddress to, string subject, string body)
    {
        var payload = new
        {
            from = new { email = fromAddress, name = "Cloud Storage" },
            to = new[]
            {
                new { email = to.Address, name = to.DisplayName }
            },
            subject,
            html = body,
        };

        var content = new StringContent(JsonSerializer.Serialize(payload));
        content.Headers.ContentType = new MediaTypeHeaderValue("application/json");

        var response = await httpClient.PostAsync("email", content);
        response.EnsureSuccessStatusCode();
    }
}