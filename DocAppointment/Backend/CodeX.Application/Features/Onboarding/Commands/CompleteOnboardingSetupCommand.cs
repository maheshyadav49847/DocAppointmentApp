using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CodeX.Application.Common.Interfaces;
using CodeX.Application.Features.Onboarding.DTOs;
using CodeX.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;
using StaffEntity = CodeX.Domain.Entities.Staff;

namespace CodeX.Application.Features.Onboarding.Commands
{
    public class CompleteOnboardingSetupCommand : IRequest<CompleteOnboardingSetupResult>
    {
        public BranchSetupDto Branch { get; set; } = new();
        public DoctorSetupDto Doctor { get; set; } = new();
        public SessionSetupDto Session { get; set; } = new();
        public RateListSetupDto RateList { get; set; } = new();
    }

    public class CompleteOnboardingSetupCommandHandler : IRequestHandler<CompleteOnboardingSetupCommand, CompleteOnboardingSetupResult>
    {
        private readonly IApplicationDbContext _context;
        private readonly ICurrentUserService _currentUserService;

        public CompleteOnboardingSetupCommandHandler(IApplicationDbContext context, ICurrentUserService currentUserService)
        {
            _context = context;
            _currentUserService = currentUserService;
        }

        public async Task<CompleteOnboardingSetupResult> Handle(CompleteOnboardingSetupCommand request, CancellationToken cancellationToken)
        {
            var orgId = _currentUserService.OrgId;
            if (orgId == Guid.Empty)
            {
                throw new UnauthorizedAccessException("Organization context not found in user session.");
            }

            // Fallback placeholder logo if not provided (transparent 1x1 pixel PNG)
            const string defaultLogoPlaceholder = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

            // 1. STEP 1: Branch Setup
            var branch = await _context.Branches
                .FirstOrDefaultAsync(b => b.OrganizationId == orgId && !b.IsDeleted, cancellationToken);

            var telegramBotToken = string.IsNullOrWhiteSpace(request.Branch.TelegramBotToken) ? null : request.Branch.TelegramBotToken.Trim();

            if (branch == null)
            {
                var branchName = string.IsNullOrWhiteSpace(request.Branch.Name) ? "Main Clinic" : request.Branch.Name.Trim();
                var branchAddress = string.IsNullOrWhiteSpace(request.Branch.Address) ? "Clinic Address" : request.Branch.Address.Trim();
                var waNumber = string.IsNullOrWhiteSpace(request.Branch.WhatsAppNumber) 
                    ? (string.IsNullOrWhiteSpace(request.Branch.Phone) ? "9876543210" : request.Branch.Phone.Trim()) 
                    : request.Branch.WhatsAppNumber.Trim();
                var waDialCode = string.IsNullOrWhiteSpace(request.Branch.WhatsAppDialCode) ? "+91" : request.Branch.WhatsAppDialCode.Trim();
                var logo = string.IsNullOrWhiteSpace(request.Branch.LogoBase64) ? defaultLogoPlaceholder : request.Branch.LogoBase64;

                branch = new Branch
                {
                    OrganizationId = orgId,
                    Name = branchName,
                    Address = branchAddress,
                    WhatsAppNumber = waNumber,
                    WhatsAppDialCode = waDialCode,
                    TelegramBotToken = telegramBotToken,
                    LogoBase64 = logo,
                    IsActive = true
                };

                _context.Branches.Add(branch);
                await _context.SaveChangesAsync(cancellationToken);
            }
            else if (!string.IsNullOrWhiteSpace(telegramBotToken))
            {
                branch.TelegramBotToken = telegramBotToken;
                await _context.SaveChangesAsync(cancellationToken);
            }

            // 2. STEP 2: Doctor Profile
            if (request.Doctor.IsOrgAdminDoctor && string.IsNullOrWhiteSpace(request.Doctor.RegistrationNumber))
            {
                throw new ArgumentException("Medical Registration Number (MCI Number) is mandatory when the Clinic Owner/Admin is the doctor.");
            }

            var doctor = await _context.Doctors
                .Include(d => d.Branches)
                .FirstOrDefaultAsync(d => d.OrganizationId == orgId && !d.IsDeleted, cancellationToken);

            StaffEntity? currentStaff = null;
            if (Guid.TryParse(_currentUserService.UserId, out var parsedUserId))
            {
                currentStaff = await _context.Staffs
                    .FirstOrDefaultAsync(s => s.Id == parsedUserId, cancellationToken);
            }

            if (doctor == null)
            {
                var docName = string.IsNullOrWhiteSpace(request.Doctor.Name)
                    ? (currentStaff != null ? $"{currentStaff.FirstName} {currentStaff.LastName}".Trim() : "Dr. Consulting Physician")
                    : request.Doctor.Name.Trim();

                var specialization = string.IsNullOrWhiteSpace(request.Doctor.Specialization) ? "General Physician" : request.Doctor.Specialization.Trim();
                var mobile = string.IsNullOrWhiteSpace(request.Doctor.Mobile) ? currentStaff?.PhoneNumber : request.Doctor.Mobile.Trim();
                var mobileDialCode = string.IsNullOrWhiteSpace(request.Doctor.MobileDialCode) 
                    ? (currentStaff != null && !string.IsNullOrWhiteSpace(currentStaff.PhoneNumberDialCode) ? currentStaff.PhoneNumberDialCode : "+91") 
                    : request.Doctor.MobileDialCode.Trim();
                var email = string.IsNullOrWhiteSpace(request.Doctor.EmailId) ? currentStaff?.Email : request.Doctor.EmailId.Trim();
                var regNumber = request.Doctor.RegistrationNumber?.Trim() ?? string.Empty;

                doctor = new Doctor
                {
                    OrganizationId = orgId,
                    Name = docName,
                    Specialization = specialization,
                    RegistrationNumber = regNumber,
                    ConsultationFee = request.Doctor.ConsultationFee > 0 ? request.Doctor.ConsultationFee : 300,
                    Gender = request.Doctor.Gender,
                    Qualification = request.Doctor.Qualification,
                    Experience = request.Doctor.Experience,
                    MobileDialCode = mobileDialCode,
                    Mobile = mobile,
                    EmailId = email,
                    IsActive = true
                };

                doctor.Branches.Add(branch);
                _context.Doctors.Add(doctor);
                await _context.SaveChangesAsync(cancellationToken);

                // If OrgAdmin is the doctor, link staff.DoctorId
                if (request.Doctor.IsOrgAdminDoctor && currentStaff != null)
                {
                    currentStaff.DoctorId = doctor.Id;
                    currentStaff.BranchId = branch.Id;
                    await _context.SaveChangesAsync(cancellationToken);
                }
            }
            else
            {
                // Ensure branch is linked
                if (doctor.Branches == null) doctor.Branches = new System.Collections.Generic.List<Branch>();
                if (!doctor.Branches.Any(b => b.Id == branch.Id))
                {
                    doctor.Branches.Add(branch);
                    await _context.SaveChangesAsync(cancellationToken);
                }

                if (request.Doctor.IsOrgAdminDoctor && currentStaff != null && !currentStaff.DoctorId.HasValue)
                {
                    currentStaff.DoctorId = doctor.Id;
                    currentStaff.BranchId = branch.Id;
                    await _context.SaveChangesAsync(cancellationToken);
                }
            }

            // 3. STEP 3: OPD Session
            var session = await _context.Sessions
                .FirstOrDefaultAsync(s => s.BranchId == branch.Id && s.DoctorId == doctor.Id && !s.IsDeleted, cancellationToken);

            if (session == null)
            {
                var sessionName = string.IsNullOrWhiteSpace(request.Session.SessionName) ? "General OPD" : request.Session.SessionName.Trim();
                var startTime = request.Session.StartTime == TimeSpan.Zero ? new TimeSpan(9, 0, 0) : request.Session.StartTime;
                var endTime = request.Session.EndTime == TimeSpan.Zero ? new TimeSpan(13, 0, 0) : request.Session.EndTime;
                var capacity = request.Session.DefaultCapacity > 0 ? request.Session.DefaultCapacity : 30;

                if (request.Session.IsDaily)
                {
                    session = new Session
                    {
                        BranchId = branch.Id,
                        DoctorId = doctor.Id,
                        SessionName = sessionName,
                        IsDaily = true,
                        DayOfWeek = 0,
                        StartTime = startTime,
                        EndTime = endTime,
                        DefaultCapacity = capacity,
                        IsActive = true
                    };

                    _context.Sessions.Add(session);
                    await _context.SaveChangesAsync(cancellationToken);
                }
                else
                {
                    var daysToCreate = request.Session.DaysOfWeek != null && request.Session.DaysOfWeek.Any()
                        ? request.Session.DaysOfWeek.Distinct().ToList()
                        : new System.Collections.Generic.List<int> { request.Session.DayOfWeek };

                    foreach (var day in daysToCreate)
                    {
                        var daySession = new Session
                        {
                            BranchId = branch.Id,
                            DoctorId = doctor.Id,
                            SessionName = sessionName,
                            IsDaily = false,
                            DayOfWeek = day,
                            StartTime = startTime,
                            EndTime = endTime,
                            DefaultCapacity = capacity,
                            IsActive = true
                        };

                        _context.Sessions.Add(daySession);
                        if (session == null)
                        {
                            session = daySession;
                        }
                    }

                    await _context.SaveChangesAsync(cancellationToken);
                }
            }

            // 4. STEP 4: Service Item / Rate List
            var serviceItem = await _context.ServiceItems
                .FirstOrDefaultAsync(si => si.OrganizationId == orgId && !si.IsDeleted, cancellationToken);

            if (serviceItem == null)
            {
                var serviceName = string.IsNullOrWhiteSpace(request.RateList.ServiceName) ? "Doctor Consultation" : request.RateList.ServiceName.Trim();
                var category = string.IsNullOrWhiteSpace(request.RateList.Category) ? "Consultation" : request.RateList.Category.Trim();
                var price = request.RateList.Price > 0 ? request.RateList.Price : (doctor.ConsultationFee > 0 ? doctor.ConsultationFee : 300);

                serviceItem = new ServiceItem
                {
                    OrganizationId = orgId,
                    Name = serviceName,
                    Category = category,
                    DefaultPrice = price,
                    IsActive = true
                };

                _context.ServiceItems.Add(serviceItem);
                await _context.SaveChangesAsync(cancellationToken);
            }

            // If current staff still has no BranchId assigned, assign the newly created branch
            if (currentStaff != null && !currentStaff.BranchId.HasValue)
            {
                currentStaff.BranchId = branch.Id;
                await _context.SaveChangesAsync(cancellationToken);
            }

            return new CompleteOnboardingSetupResult
            {
                Success = true,
                BranchId = branch.Id,
                DoctorId = doctor.Id,
                SessionId = session.Id,
                ServiceItemId = serviceItem.Id,
                Message = "Tenant onboarding completed successfully!"
            };
        }
    }
}
