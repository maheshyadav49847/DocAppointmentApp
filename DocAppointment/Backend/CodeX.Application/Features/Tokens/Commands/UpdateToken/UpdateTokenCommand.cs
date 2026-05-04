using MediatR;
using Microsoft.EntityFrameworkCore;
using CodeX.Application.Common.Interfaces;

namespace CodeX.Application.Features.Tokens.Commands.UpdateToken
{
    public record UpdateTokenCommand : IRequest<bool>
    {
        public Guid TokenId { get; init; }
        public string PatientName { get; init; } = string.Empty;
        public string PatientPhone { get; init; } = string.Empty;
    }

    public class UpdateTokenCommandHandler : IRequestHandler<UpdateTokenCommand, bool>
    {
        private readonly IApplicationDbContext _context;

        public UpdateTokenCommandHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<bool> Handle(UpdateTokenCommand request, CancellationToken cancellationToken)
        {
            try
            {
                var token = await _context.Tokens
                    .Include(t => t.Patient)
                    .FirstOrDefaultAsync(t => t.Id == request.TokenId, cancellationToken);

                if (token == null) throw new Exception("Token not found");

                // 1. Duplicate Check for ACTIVE tokens in the same queue
                var isDuplicateActive = await _context.Tokens
                    .AnyAsync(t => t.QueueId == token.QueueId && 
                                  t.Id != token.Id && 
                                  t.Patient.Phone == request.PatientPhone &&
                                  (t.Status == CodeX.Domain.Enums.TokenStatus.Pending || t.Status == CodeX.Domain.Enums.TokenStatus.Called), 
                                  cancellationToken);
                
                if (isDuplicateActive)
                {
                    throw new Exception("Another active patient already has this phone number in this session.");
                }

                // 2. Handle Patient Update/Link
                var existingPatient = await _context.Patients
                    .FirstOrDefaultAsync(p => p.Phone == request.PatientPhone, cancellationToken);

                if (existingPatient != null)
                {
                    // Case: Changing number to another existing patient's number
                    if (token.PatientId != existingPatient.Id)
                    {
                        token.PatientId = existingPatient.Id;
                    }
                    existingPatient.Name = request.PatientName;
                }
                else if (token.Patient != null)
                {
                    // Case: Updating current patient's details
                    token.Patient.Name = request.PatientName;
                    token.Patient.Phone = request.PatientPhone;
                }

                await _context.SaveChangesAsync(cancellationToken);
                return true;
            }
            catch (Exception ex)
            {
                // Re-throw with more context or handle
                throw new Exception($"Update failed: {ex.Message}", ex);
            }
        }
    }
}
