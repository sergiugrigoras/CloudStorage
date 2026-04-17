using CloudStorage.Models;

namespace CloudStorage.ViewModels;

public class UserViewModel
{
    public string Id { get; set; }

    public string Name { get; set; }
    public string Email { get; set; }
    public bool Disabled { get; set; }
    public DateTime? LastActive { get; set; }

    public static UserViewModel FromDomain(User user)
    {
        return new UserViewModel
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            Disabled = user.Disabled,
            LastActive =
                user.LastActive.HasValue ? DateTime.SpecifyKind(user.LastActive.Value, DateTimeKind.Utc) : null,
        };
    }
}