using CodeX.Application.Features.Auth.Commands.Login;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

using CodeX.Application.Common.Settings;
using Microsoft.Extensions.Options;

namespace CodeX.Api.Controllers
{
    public class AuthController : BaseApiController
    {
        private readonly JwtSettings _jwtSettings;

        public AuthController(IOptions<JwtSettings> jwtOptions)
        {
            _jwtSettings = jwtOptions.Value;
        }
        [AllowAnonymous]
        [HttpPost("login")]
        public async Task<ActionResult<object>> Login(LoginCommand command)
        {
            try
            {
                var response = await Mediator.Send(command);

                var cookieOptions = new CookieOptions
                {
                    HttpOnly = true,
                    Secure = Request.IsHttps, 
                    SameSite = SameSiteMode.Strict,
                    Expires = DateTime.UtcNow.AddMinutes(_jwtSettings.AccessTokenExpiryMinutes)
                };

                var refreshCookieOptions = new CookieOptions
                {
                    HttpOnly = true,
                    Secure = Request.IsHttps,
                    SameSite = SameSiteMode.Strict,
                    Expires = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpiryDays)
                };

                Response.Cookies.Append("jwt_token", response.Token, cookieOptions);
                Response.Cookies.Append("refresh_token", response.RefreshToken, refreshCookieOptions);

                // Return user info WITH the token so the frontend can use it in headers
                return Ok(new 
                { 
                    token = response.Token,
                    email = response.Email, 
                    role = response.Role, 
                    orgId = response.OrgId, 
                    branchId = response.BranchId,
                    doctorId = response.DoctorId
                });
            }
            catch (Exception ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
        }

        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            var refreshToken = Request.Cookies["refresh_token"];
            if (!string.IsNullOrEmpty(refreshToken))
            {
                await Mediator.Send(new CodeX.Application.Features.Auth.Commands.Logout.LogoutCommand(refreshToken));
            }

            Response.Cookies.Delete("jwt_token");
            Response.Cookies.Delete("refresh_token");
            return Ok(new { message = "Logged out successfully" });
        }

        [AllowAnonymous]
        [HttpPost("refresh")]
        public async Task<ActionResult<object>> Refresh()
        {
            try
            {
                var token = Request.Cookies["jwt_token"];
                var refreshToken = Request.Cookies["refresh_token"];

                if (string.IsNullOrEmpty(refreshToken))
                {
                    return Unauthorized(new { message = "Refresh token is missing" });
                }

                var command = new CodeX.Application.Features.Auth.Commands.RefreshToken.RefreshTokenCommand
                {
                    Token = token ?? "",
                    RefreshToken = refreshToken
                };

                var response = await Mediator.Send(command);

                var cookieOptions = new CookieOptions
                {
                    HttpOnly = true,
                    Secure = Request.IsHttps, 
                    SameSite = SameSiteMode.Strict,
                    Expires = DateTime.UtcNow.AddMinutes(_jwtSettings.AccessTokenExpiryMinutes)
                };

                var refreshCookieOptions = new CookieOptions
                {
                    HttpOnly = true,
                    Secure = Request.IsHttps,
                    SameSite = SameSiteMode.Strict,
                    Expires = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpiryDays)
                };

                Response.Cookies.Append("jwt_token", response.Token, cookieOptions);
                Response.Cookies.Append("refresh_token", response.RefreshToken, refreshCookieOptions);

                return Ok(new 
                { 
                    token = response.Token,
                    email = response.Email, 
                    role = response.Role, 
                    orgId = response.OrgId, 
                    branchId = response.BranchId,
                    doctorId = response.DoctorId
                });
            }
            catch (Exception ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
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

        [Authorize]
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword(CodeX.Application.Features.Auth.Commands.ChangePassword.ChangePasswordCommand command)
        {
            await Mediator.Send(command);
            return Ok(new { message = "Password has been changed successfully." });
        }
    }
}
