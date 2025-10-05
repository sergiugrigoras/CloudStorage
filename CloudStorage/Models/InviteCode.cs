namespace CloudStorage.Models;

public class InviteCode
{
    public Guid Id { get; set; }
    public string Code { get; set; }
    public string Email { get; set; }
    public DateTime? Date { get; set; }
}