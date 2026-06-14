using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;

namespace CodeX.Api.Controllers
{
    public class BranchesController : BaseApiController
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public BranchesController(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }
        [HttpGet("list")]
        public async Task<ActionResult<List<Branch>>> Get()
        {
            return await _context.Branches
                .Where(b => b.OrganizationId == _currentUserService.OrgId)
                .ToListAsync();
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Branch>> Get(Guid id)
        {
            var branch = await _context.Branches
                .FirstOrDefaultAsync(b => b.Id == id && b.OrganizationId == _currentUserService.OrgId);

            if (branch == null) return NotFound();
            return branch;
        }

        [HttpGet("org/{orgId}")]
        public async Task<ActionResult<List<Branch>>> GetByOrg(Guid orgId)
        {
            // IDOR Protection: Ensure user can only see branches of their own organization
            if (orgId != _currentUserService.OrgId && !_currentUserService.IsInRole("SuperAdmin"))
            {
                return Forbid();
            }

            return await _context.Branches
                .Where(b => b.OrganizationId == orgId)
                .ToListAsync();
        }

        [HttpPost]
        [Authorize(Roles = "OrgAdmin,BranchAdmin")]
        [CodeX.Api.Filters.CheckSubscriptionLimit(CodeX.Api.Filters.SubscriptionLimitType.Branches)]
        public async Task<ActionResult<Guid>> Create(Branch branch)
        {
            // Ensure the branch is created for the user's organization
            branch.OrganizationId = _currentUserService.OrgId;

            // Code-level check: Prevent duplicate branch name in same organization
            var name = branch.Name.Trim();
            var duplicateExists = await _context.Branches.AnyAsync(b => 
                b.OrganizationId == branch.OrganizationId && 
                b.Name.ToLower() == name.ToLower() && 
                !b.IsDeleted);

            if (duplicateExists)
            {
                return BadRequest(new { message = $"A branch with the name '{name}' already exists in your organization." });
            }

            _context.Branches.Add(branch);
            await _context.SaveChangesAsync(default);
            return branch.Id;
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "OrgAdmin,BranchAdmin")]
        public async Task<IActionResult> Update(Guid id, Branch updatedBranch)
        {
            var branch = await _context.Branches
                .FirstOrDefaultAsync(b => b.Id == id && b.OrganizationId == _currentUserService.OrgId);

            if (branch == null) return NotFound();

            var name = updatedBranch.Name.Trim();
            // Code-level check: Prevent duplicate branch name in same organization
            var duplicateExists = await _context.Branches.AnyAsync(b => 
                b.Id != id &&
                b.OrganizationId == branch.OrganizationId && 
                b.Name.ToLower() == name.ToLower() && 
                !b.IsDeleted);

            if (duplicateExists)
            {
                return BadRequest(new { message = $"Another branch with the name '{name}' already exists in your organization." });
            }

            branch.Name = name;
            branch.Address = updatedBranch.Address;
            branch.WhatsAppNumber = updatedBranch.WhatsAppNumber;
            branch.IsActive = updatedBranch.IsActive;

            await _context.SaveChangesAsync(default);
            return NoContent();
        }
        [HttpDelete("{id}")]
        [Authorize(Roles = "OrgAdmin,BranchAdmin")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var branch = await _context.Branches
                .FirstOrDefaultAsync(b => b.Id == id && b.OrganizationId == _currentUserService.OrgId);

            if (branch == null) return NotFound();

            // Soft delete
            branch.IsDeleted = true;
            await _context.SaveChangesAsync(default);
            
            return NoContent();
        }
    }
}
