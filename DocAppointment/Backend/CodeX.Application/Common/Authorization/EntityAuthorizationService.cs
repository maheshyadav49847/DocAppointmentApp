using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace CodeX.Application.Common.Authorization
{
    public interface IEntityAuthorizationService
    {
        Task<bool> CanCreateStaffAsync(Guid organizationId, Guid? branchId, StaffRole targetRole);
        Task<bool> CanUpdateStaffAsync(Guid staffId, StaffRole targetRole);
        Task<bool> CanDeleteStaffAsync(Guid staffId);
        Task<bool> CanCreateSessionAsync(Guid doctorId, Guid branchId);
        Task<bool> CanUpdateSessionAsync(Guid sessionId);
        Task<bool> CanDeleteSessionAsync(Guid sessionId);
        Task<bool> CanCreateDoctorAsync(Guid organizationId, Guid branchId);
        Task<bool> CanUpdateDoctorAsync(Guid doctorId);
        Task<bool> CanDeleteDoctorAsync(Guid doctorId);
        Task<bool> CanCreateQueueAsync(Guid doctorId, Guid sessionId);
        Task<bool> CanManipulateQueueAsync(Guid queueId);
    }

    public class EntityAuthorizationService : IEntityAuthorizationService
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUser;

        public EntityAuthorizationService(IApplicationDbContext context, ICurrentUserService currentUser)
        {
            _context = context;
            _currentUser = currentUser;
        }

        public Task<bool> CanCreateStaffAsync(Guid organizationId, Guid? branchId, StaffRole targetRole)
        {
            if (!_currentUser.IsInRole(nameof(StaffRole.SuperAdmin)) &&
                !_currentUser.IsInRole(nameof(StaffRole.OrgAdmin)) &&
                !_currentUser.IsInRole(nameof(StaffRole.BranchAdmin)))
            {
                return Task.FromResult(false);
            }

            if (!_currentUser.IsInRole(nameof(StaffRole.SuperAdmin)) && organizationId != _currentUser.OrgId)
            {
                return Task.FromResult(false);
            }

            if (_currentUser.IsInRole(nameof(StaffRole.BranchAdmin)))
            {
                if (!_currentUser.BranchId.HasValue || branchId != _currentUser.BranchId)
                {
                    return Task.FromResult(false);
                }

                if (targetRole is StaffRole.OrgAdmin or StaffRole.BranchAdmin or StaffRole.SuperAdmin)
                {
                    return Task.FromResult(false);
                }
            }

            return Task.FromResult(true);
        }

        public async Task<bool> CanUpdateStaffAsync(Guid staffId, StaffRole targetRole)
        {
            var staff = await _context.Staffs.FirstOrDefaultAsync(s => s.Id == staffId);
            if (staff == null)
            {
                return false;
            }

            if (staff.Role == StaffRole.SuperAdmin && !_currentUser.IsInRole(nameof(StaffRole.SuperAdmin)))
            {
                return false;
            }

            if (!_currentUser.IsInRole(nameof(StaffRole.SuperAdmin)) && staff.OrganizationId != _currentUser.OrgId)
            {
                return false;
            }

            if (_currentUser.IsInRole(nameof(StaffRole.BranchAdmin)))
            {
                if (staff.BranchId != _currentUser.BranchId)
                {
                    return false;
                }

                if (targetRole is StaffRole.OrgAdmin or StaffRole.BranchAdmin or StaffRole.SuperAdmin)
                {
                    return false;
                }
            }

            return true;
        }

        public async Task<bool> CanDeleteStaffAsync(Guid staffId)
        {
            var staff = await _context.Staffs.FirstOrDefaultAsync(s => s.Id == staffId);
            if (staff == null)
            {
                return false;
            }

            if (staff.Role == StaffRole.SuperAdmin && !_currentUser.IsInRole(nameof(StaffRole.SuperAdmin)))
            {
                return false;
            }

            if (!_currentUser.IsInRole(nameof(StaffRole.SuperAdmin)) && staff.OrganizationId != _currentUser.OrgId)
            {
                return false;
            }

            if (_currentUser.IsInRole(nameof(StaffRole.BranchAdmin)))
            {
                if (staff.BranchId != _currentUser.BranchId)
                {
                    return false;
                }

                if (staff.Role is StaffRole.OrgAdmin or StaffRole.BranchAdmin)
                {
                    return false;
                }
            }

            return true;
        }

        public async Task<bool> CanCreateSessionAsync(Guid doctorId, Guid branchId)
        {
            var doctor = await _context.Doctors
                .Include(d => d.Branches)
                .FirstOrDefaultAsync(d => d.Id == doctorId);

            if (doctor == null || !doctor.Branches.Any(b => b.Id == branchId))
            {
                return false;
            }

            return await _context.Branches.AnyAsync(b =>
                b.Id == branchId &&
                (_currentUser.IsInRole(nameof(StaffRole.SuperAdmin)) || b.OrganizationId == _currentUser.OrgId));
        }

        public async Task<bool> CanUpdateSessionAsync(Guid sessionId)
        {
            return await _context.Sessions
                .AnyAsync(s => s.Id == sessionId &&
                               (_currentUser.IsInRole(nameof(StaffRole.SuperAdmin)) ||
                                s.Branch.OrganizationId == _currentUser.OrgId));
        }

        public Task<bool> CanDeleteSessionAsync(Guid sessionId)
        {
            return CanUpdateSessionAsync(sessionId);
        }

        public async Task<bool> CanCreateDoctorAsync(Guid organizationId, Guid branchId)
        {
            if (!_currentUser.IsInRole(nameof(StaffRole.SuperAdmin)) && organizationId != _currentUser.OrgId)
            {
                return false;
            }

            return await _context.Branches.AnyAsync(b => b.Id == branchId && b.OrganizationId == organizationId);
        }

        public async Task<bool> CanUpdateDoctorAsync(Guid doctorId)
        {
            return await _context.Doctors.AnyAsync(d =>
                d.Id == doctorId &&
                (_currentUser.IsInRole(nameof(StaffRole.SuperAdmin)) || d.OrganizationId == _currentUser.OrgId));
        }

        public Task<bool> CanDeleteDoctorAsync(Guid doctorId)
        {
            return CanUpdateDoctorAsync(doctorId);
        }

        public async Task<bool> CanCreateQueueAsync(Guid doctorId, Guid sessionId)
        {
            return await _context.Sessions.AnyAsync(s =>
                s.Id == sessionId &&
                s.DoctorId == doctorId &&
                (_currentUser.IsInRole(nameof(StaffRole.SuperAdmin)) || s.Branch.OrganizationId == _currentUser.OrgId));
        }

        public async Task<bool> CanManipulateQueueAsync(Guid queueId)
        {
            return await _context.DailyQueues.AnyAsync(q =>
                q.Id == queueId &&
                (_currentUser.IsInRole(nameof(StaffRole.SuperAdmin)) || q.Branch.OrganizationId == _currentUser.OrgId));
        }
    }
}
