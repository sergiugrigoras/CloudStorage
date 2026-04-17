using System.Net.Mail;
using CloudStorage.Models;
using CloudStorage.Services;
using CloudStorage.ViewModels;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CloudStorage.Controllers;

[Authorize(Roles = Roles.Admin)]
[ApiController]
[Route("api/[controller]")]

public class AdminController(IUserService userService, IMailService mailService) : ControllerBase
{
    private readonly IUserService _userService = userService ?? throw new ArgumentNullException(nameof(userService));
    private readonly IMailService _mailService = mailService ?? throw new ArgumentNullException(nameof(mailService));
    
    
    [HttpGet("all-users")]
    public async Task<IActionResult> GetUserListAsync()
    {
        var userList = await _userService.GetAllUsersAsync();
        return new JsonResult(userList.Select(UserViewModel.FromDomain));
    }

    [HttpPatch("update-user")]
    public async Task<IActionResult> UpdateUserAsync([FromBody] UserViewModel userViewModel)
    {
        try
        {
            var result = await _userService.SetUserDisabledAsync(userViewModel.Id, userViewModel.Disabled);
            if (result == null)
                return NotFound();
            var response = UserViewModel.FromDomain(result);
            return Ok(response);
        }
        catch (InvalidOperationException e)
        {
            return BadRequest(e.Message);
        }
        catch (Exception)
        {
            return StatusCode(500, "An unexpected error occurred.");
        }
    }

    [HttpPost("invite-user")]
    public async Task<IActionResult> InviteUserAsync([FromQuery] string email)
    {
        if (string.IsNullOrWhiteSpace(email) || !EmailHelper.EmailRegex.IsMatch(email)) 
            return BadRequest("Invalid email");
        try
        {
            var inviteCode = await _userService.CreateInviteCodeAsync(email);
            var registerLink = $"{Request.Scheme}://{Request.Host}/register";
            var emailBody = EmailHelper.GenerateInviteEmailBody(inviteCode, registerLink, email);
            const string subject = EmailHelper.InviteSubject;
            await _mailService.SendEmailAsync(new MailAddress(email), subject, emailBody);
            return Ok();
        }
        catch (InvalidOperationException e)
        {
            return BadRequest(e.Message);
        }
        catch (Exception e)
        {
            return BadRequest(e.Message);
        }
    }
}