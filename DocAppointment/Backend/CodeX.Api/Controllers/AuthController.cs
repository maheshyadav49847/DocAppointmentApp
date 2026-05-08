using CodeX.Application.Features.Auth.Commands.Login;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CodeX.Api.Controllers
{
    public class AuthController : BaseApiController
    {
        [AllowAnonymous]
        [HttpPost("login")]
        public async Task<ActionResult<object>> Login(LoginCommand command)
        {
            try
            {
                var response = await Mediator.Send(command);

                // Set secure httpOnly cookie
                var cookieOptions = new CookieOptions
                {
                    HttpOnly = true,
                    Secure = false, 
                    SameSite = SameSiteMode.Lax,
                    Expires = DateTime.UtcNow.AddHours(2)
                };

                Response.Cookies.Append("jwt_token", response.Token, cookieOptions);

                // Return user info WITH the token so the frontend can use it in headers
                return Ok(new 
                { 
                    token = response.Token,
                    email = response.Email, 
                    role = response.Role, 
                    orgId = response.OrgId, 
                    branchId = response.BranchId 
                });
            }
            catch (Exception ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
        }

        [HttpPost("logout")]
        public IActionResult Logout()
        {
            Response.Cookies.Delete("jwt_token");
            return Ok(new { message = "Logged out successfully" });
        }

        [AllowAnonymous]
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword(CodeX.Application.Features.Auth.Commands.ForgotPassword.ForgotPasswordCommand command)
        {
            await Mediator.Send(command);
            return Ok(new { message = "If your email is registered, you will receive an OTP via WhatsApp." });
        }

        [AllowAnonymous]
        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword(CodeX.Application.Features.Auth.Commands.ResetPassword.ResetPasswordCommand command)
        {
            await Mediator.Send(command);
            return Ok(new { message = "Password has been reset successfully." });
        }
    }
}
