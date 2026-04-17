using System.Net.Http.Headers;
using System.Net.Mail;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.RegularExpressions;
using CloudStorage.Models;
using CloudStorage.Models.Settings;
using Microsoft.Extensions.Options;

namespace CloudStorage.Services;

public interface IMailService
{
    Task SendEmailAsync(MailAddress address, string subject, string body);
}

public class MailService(MailerSendClient mailerSend, IOptions<MailerSendSettings> options) : IMailService
{
    private readonly string _fromAddress = options.Value.Postmaster;

    public Task SendEmailAsync(MailAddress to, string subject, string body) =>
        mailerSend.SendEmailAsync(_fromAddress, to, subject, body);
}

public class DevMailService : IMailService
{
    public Task SendEmailAsync(MailAddress address, string subject, string body)
    {
        var output = Path.GetTempPath();
        var content = new
        {
            address.Address,
            address.DisplayName,
            subject,
            body
        };
        var options = new JsonSerializerOptions
        {
            WriteIndented = true,
            Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping
        };
        var json = JsonSerializer.Serialize(content, options);
        
        var path = Path.Combine(output, "email");
        if (!Directory.Exists(path))
            Directory.CreateDirectory(path);
        var fileName = $"{DateTime.UtcNow:yyyyMMddHHmmss}_{Guid.NewGuid():N}.json";
        File.WriteAllText(Path.Combine(path, fileName), json);
        return Task.CompletedTask;
    }
}

public static class EmailHelper
{
    public const string PasswordResetSubject = "Cloud Storage - Password reset instructions";
    public const string InviteSubject = "Cloud Storage - Registration instructions";

    public static string HideEmail(string email) => Regex.Replace(email, @"(?<=[\w]{1})[\w-\._\+%]*(?=[\w]{2}@)",
        m => new string('*', m.Length));

    public static readonly Regex EmailRegex = new Regex(
        @"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    public static string GeneratePasswordResetEmailBody(string resetLink)
    {
        var year = DateTime.Now.Year;
        var body = $"""
                    <!doctype html>
                    <html>

                    <head>
                        <meta charset="utf-8" />
                        <meta name="viewport" content="width=device-width" />
                        <title>Password reset</title>
                    </head>

                    <body style="margin:0;padding:0;background-color:#f4f6f8;font-family:Helvetica,Arial,sans-serif;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                            style="background-color:#f4f6f8;padding:40px 0;">
                            <tr>
                                <td align="center">
                                    <!-- container -->
                                    <table role="presentation" width="600" cellpadding="0" cellspacing="0"
                                        style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
                                        <tr>
                                            <td style="padding:24px 28px;border-bottom:1px solid #eef2f5;">
                                                <!-- header -->
                                                <div style="display:flex;align-items:center;gap:12px;">
                                                    <div style="font-size:18px;font-weight:600;color:#0f1724;">Cloud Storage</div>
                                                </div>
                                            </td>
                                        </tr>

                                        <tr>
                                            <td style="padding:28px;">
                                                <h1 style="margin:0 0 12px 0;font-size:20px;color:#0f1724;">Reset your password</h1>
                                                <p style="margin:0 0 18px 0;color:#475569;line-height:1.5;">
                                                    Hello,
                                                </p>

                                                <p style="margin:0 0 24px 0;color:#475569;line-height:1.5;">
                                                    We received a request to reset the password for your account. Click the button below to
                                                    choose a new password.
                                                </p>

                                                <!-- button -->
                                                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0 24px 0;">
                                                    <tr>
                                                        <td align="left">
                                                            <a href="{resetLink}" target="_blank"
                                                                style="background-color:#2563eb;border-radius:8px;color:#ffffff;padding:12px 20px;text-decoration:none;display:inline-block;font-weight:600;">
                                                                Reset password
                                                            </a>
                                                        </td>
                                                    </tr>
                                                </table>

                                                <p style="margin:0 0 18px 0;color:#6b7280;font-size:13px;line-height:1.5;">
                                                    If the button above doesn't work, copy and paste this URL into your browser:
                                                </p>
                                                <p style="word-break:break-all;font-size:13px;color:#2563eb;margin:0 0 20px 0;">
                                                    {resetLink}
                                                </p>

                                                <p style="margin:0 0 8px 0;color:#6b7280;font-size:13px;line-height:1.4;">
                                                    This link will expire in <strong>60 minutes</strong>. If you didn't request a password
                                                    reset, you can safely ignore this email — your password will remain unchanged.
                                                </p>
                                            </td>
                                        </tr>

                                        <tr>
                                            <td
                                                style="padding:16px 28px;background:#fbfdff;border-top:1px solid #eef2f5;font-size:13px;color:#9aa4b2;">
                                                <div style="display:flex;justify-content:space-between;align-items:center;">
                                                    <div>© {year}. All rights reserved.</div>
                                                    <div style="opacity:0.9;">Cloud Storage</div>
                                                </div>
                                            </td>
                                        </tr>
                                    </table>
                                    <!-- end container -->
                                </td>
                            </tr>
                        </table>
                    </body>

                    </html>
                    """;
        return body;
    }

    public static string GenerateInviteEmailBody(string inviteCode, string registerLink, string email)
    {
        var year = DateTime.Now.Year;
        var inviteLink = $"{registerLink}?inviteCode={inviteCode}&email={email}";
        var body = $"""
                    <!doctype html>
                    <html>

                    <head>
                        <meta charset="utf-8" />
                        <meta name="viewport" content="width=device-width" />
                        <title>You're Invited</title>
                    </head>

                    <body style="margin:0;padding:0;background-color:#f4f6f8;font-family:Helvetica,Arial,sans-serif;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                            style="background-color:#f4f6f8;padding:40px 0;">
                            <tr>
                                <td align="center">
                                    <!-- container -->
                                    <table role="presentation" width="600" cellpadding="0" cellspacing="0"
                                        style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
                                        <tr>
                                            <td style="padding:24px 28px;border-bottom:1px solid #eef2f5;">
                                                <!-- header -->
                                                <div style="display:flex;align-items:center;gap:12px;">
                                                    <div style="font-size:18px;font-weight:600;color:#0f1724;">Cloud Storage</div>
                                                </div>
                                            </td>
                                        </tr>

                                        <tr>
                                            <td style="padding:28px;">
                                                <h1 style="margin:0 0 12px 0;font-size:20px;color:#0f1724;">You're Invited!</h1>
                                                <p style="margin:0 0 18px 0;color:#475569;line-height:1.5;">
                                                    You’ve been invited to join Cloud Storage.
                                                </p>

                                                <p style="margin:0 0 24px 0;color:#475569;line-height:1.5;">
                                                    To get started click the button <strong>Accept Invitation</strong> or navigate to 
                                                    {registerLink} and enter your code manually.
                                                </p>

                                                <!-- one-click button -->
                                                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0 24px 0;">
                                                    <tr>
                                                        <td align="left">
                                                            <a href="{inviteLink}" target="_blank"
                                                                style="background-color:#2563eb;border-radius:8px;color:#ffffff;padding:12px 20px;text-decoration:none;display:inline-block;font-weight:600;">
                                                                Accept Invitation
                                                            </a>
                                                        </td>
                                                    </tr>
                                                </table>

                                                <p style="font-size:16px;font-weight:600;color:#2563eb;margin:0 0 24px 0;">
                                                    Invite CodeHash: {inviteCode}
                                                </p>
                                            </td>
                                        </tr>

                                        <tr>
                                            <td
                                                style="padding:16px 28px;background:#fbfdff;border-top:1px solid #eef2f5;font-size:13px;color:#9aa4b2;">
                                                <div style="display:flex;justify-content:space-between;align-items:center;">
                                                    <div>© {year}. All rights reserved.</div>
                                                    <div style="opacity:0.9;">Cloud Storage</div>
                                                </div>
                                            </td>
                                        </tr>
                                    </table>
                                    <!-- end container -->
                                </td>
                            </tr>
                        </table>
                    </body>

                    </html>
                    """;
        return body;
    }
}