using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CodeX.Api.Controllers
{
    public class BranchesController : BaseApiController
    {
        private readonly IApplicationDbContext _context;

        public BranchesController(IApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Branch>> Get(Guid id)
        {
            var branch = await _context.Branches.FindAsync(id);
            if (branch == null) return NotFound();
            return branch;
        }

        [HttpGet("org/{orgId}")]
        public async Task<ActionResult<List<Branch>>> GetByOrg(Guid orgId)
        {
            return await _context.Branches
                .Where(b => b.OrganizationId == orgId)
                .ToListAsync();
        }

        [HttpPost]
        public async Task<ActionResult<Guid>> Create(Branch branch)
        {
            _context.Branches.Add(branch);
            await _context.SaveChangesAsync(default);
            return branch.Id;
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, Branch updatedBranch)
        {
            var branch = await _context.Branches.FindAsync(id);
            if (branch == null) return NotFound();

            branch.Name = updatedBranch.Name;
            branch.Address = updatedBranch.Address;
            branch.WhatsAppNumber = updatedBranch.WhatsAppNumber;
            branch.IsActive = updatedBranch.IsActive;

            await _context.SaveChangesAsync(default);
            return NoContent();
        }
    }
}
