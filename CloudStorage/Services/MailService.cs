using System.Net.Mail;

namespace CloudStorage.Services;

public interface IMailService
{
    void SendEmail(MailAddress toEmailAddress, MailAddress fromEmailAddress, string emailSubject, string emailBody);
}
public class MailService : IMailService
{
    public void SendEmail(MailAddress toEmailAddress, MailAddress fromEmailAddress, string emailSubject, string emailBody)
    {
        var message = new MailMessage(fromEmailAddress, toEmailAddress);
        message.Subject = emailSubject;
        message.Body = emailBody;

        var client = new SmtpClient("localhost", 25);
        try
        {
            client.Send(message);
        }
        catch (SmtpException ex)
        {
            Console.WriteLine(ex.Message);
        }
    }
}

public class DevMailService(string rootDir) : IMailService
{
    public void SendEmail(MailAddress toEmailAddress, MailAddress fromEmailAddress, string emailSubject, string emailBody)
    {
        var pathToSave = Path.Combine(rootDir, "mails", "outbox");
        if (!Directory.Exists(pathToSave))
        {
            Directory.CreateDirectory(pathToSave);
        }
        File.WriteAllText(Path.Combine(pathToSave, toEmailAddress.Address.Replace("@", "_at_")), $"{emailSubject}\n{emailBody}");
    }
}