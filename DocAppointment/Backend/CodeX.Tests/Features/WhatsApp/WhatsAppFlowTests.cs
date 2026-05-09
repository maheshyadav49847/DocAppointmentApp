using System;
using System.Threading;
using System.Threading.Tasks;
using Xunit;
using Moq;
using Microsoft.EntityFrameworkCore;
using CodeX.Infrastructure.Persistence;
using CodeX.Application.Features.WhatsApp.Commands.ProcessIncomingMessage;
using CodeX.Application.Common.Interfaces;
using CodeX.Application.Features.Tokens.Commands.CreateToken;
using CodeX.Domain.Entities;
using CodeX.Domain.Enums;
using System.Linq;

namespace CodeX.Tests.Features.WhatsApp
{
    public class WhatsAppFlowTests
    {
        private static ApplicationDbContext CreateContext()
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            return new ApplicationDbContext(options);
        }

        [Fact]
        public async Task BranchIsolation_NoDoctorsInOtherBranch()
        {
            using var context = CreateContext();

            // Seed branch A with a doctor and queue
            var orgId = Guid.NewGuid();
            var branchA = new Branch { Id = Guid.NewGuid(), Name = "A", OrganizationId = orgId };
            var branchB = new Branch { Id = Guid.NewGuid(), Name = "B", OrganizationId = orgId };
            context.Branches.AddRange(branchA, branchB);

            var doctor = new Doctor { Id = Guid.NewGuid(), Name = "Dr. A", OrganizationId = orgId };
            context.Doctors.Add(doctor);

            var session = new Session { Id = Guid.NewGuid(), DoctorId = doctor.Id, BranchId = branchA.Id, SessionName = "S" };
            context.Sessions.Add(session);

            var queue = new DailyQueue { Id = Guid.NewGuid(), DoctorId = doctor.Id, SessionId = session.Id, BranchId = branchA.Id, QueueDate = DateTime.UtcNow.Date };
            context.DailyQueues.Add(queue);

            var patientPhone = "+911234567890";
            var patient = new Patient { Id = Guid.NewGuid(), Phone = patientPhone, Name = "Test User" };
            context.Patients.Add(patient);
            
            context.SaveChanges();

            var mediatorMock = new Mock<MediatR.ISender>();
            var handler = new ProcessIncomingMessageCommandHandler(context, mediatorMock.Object);

            // Send message with branch B context - should return no doctors available
            var res = await handler.Handle(new ProcessIncomingMessageCommand { From = patientPhone, MessageBody = "hi", BranchId = branchB.Id }, CancellationToken.None);

            Assert.Contains("No doctors", res, StringComparison.OrdinalIgnoreCase);
        }

        [Fact]
        public async Task BookingFlow_CreateTokenAndStatusAndCancel()
        {
            using var context = CreateContext();

            var orgId = Guid.NewGuid();
            var branch = new Branch { Id = Guid.NewGuid(), Name = "Main", OrganizationId = orgId };
            context.Branches.Add(branch);

            var doctor = new Doctor { Id = Guid.NewGuid(), Name = "Dr. Test", OrganizationId = orgId };
            context.Doctors.Add(doctor);

            var session = new Session { Id = Guid.NewGuid(), DoctorId = doctor.Id, BranchId = branch.Id, SessionName = "Morning" };
            context.Sessions.Add(session);

            var queue = new DailyQueue { Id = Guid.NewGuid(), DoctorId = doctor.Id, SessionId = session.Id, BranchId = branch.Id, QueueDate = DateTime.UtcNow.Date };
            context.DailyQueues.Add(queue);

            context.SaveChanges();

            // Setup mediator to create token in DB when CreateTokenCommand is sent
            var mediatorMock = new Mock<MediatR.ISender>();
            mediatorMock.Setup(m => m.Send(It.IsAny<CreateTokenCommand>(), It.IsAny<CancellationToken>()))
                .Returns<CreateTokenCommand, CancellationToken>(async (cmd, ct) =>
                {
                    var patient = context.Patients.FirstOrDefault(p => p.Phone == cmd.PatientPhone);
                    if (patient == null)
                    {
                        patient = new Patient { Id = Guid.NewGuid(), Name = cmd.PatientName, Phone = cmd.PatientPhone };
                        context.Patients.Add(patient);
                    }

                    var token = new Token { Id = Guid.NewGuid(), QueueId = cmd.QueueId, Patient = patient, TokenNumber = 1, Status = TokenStatus.Pending, CreatedAt = DateTime.UtcNow };
                    context.Tokens.Add(token);
                    await context.SaveChangesAsync(ct);
                    return token.Id;
                });

            var handler = new ProcessIncomingMessageCommandHandler(context, mediatorMock.Object);
            var phone = "+911234000000";

            // New user - registration flow
            var r0 = await handler.Handle(new ProcessIncomingMessageCommand { From = phone, MessageBody = "hi", BranchId = branch.Id }, CancellationToken.None);
            Assert.Contains("first time", r0, StringComparison.OrdinalIgnoreCase);

            var r1 = await handler.Handle(new ProcessIncomingMessageCommand { From = phone, MessageBody = "Test User", BranchId = branch.Id }, CancellationToken.None);
            Assert.Contains("select a doctor", r1, StringComparison.OrdinalIgnoreCase);

            // Select doctor (1)
            var r2 = await handler.Handle(new ProcessIncomingMessageCommand { From = phone, MessageBody = "1", BranchId = branch.Id }, CancellationToken.None);
            Assert.Contains("select a session", r2, StringComparison.OrdinalIgnoreCase);

            // Select session (1)
            var r3 = await handler.Handle(new ProcessIncomingMessageCommand { From = phone, MessageBody = "1", BranchId = branch.Id }, CancellationToken.None);
            Assert.Contains("Type 'CONFIRM'", r3, StringComparison.OrdinalIgnoreCase);

            // Confirm booking
            var r4 = await handler.Handle(new ProcessIncomingMessageCommand { From = phone, MessageBody = "confirm", BranchId = branch.Id }, CancellationToken.None);
            Assert.Contains("Successfully booked", r4, StringComparison.OrdinalIgnoreCase);

            // Status should show token
            var r5 = await handler.Handle(new ProcessIncomingMessageCommand { From = phone, MessageBody = "status", BranchId = branch.Id }, CancellationToken.None);
            Assert.Contains("Booking Status", r5, StringComparison.OrdinalIgnoreCase);

            // Cancel booking
            var r6 = await handler.Handle(new ProcessIncomingMessageCommand { From = phone, MessageBody = "cancel", BranchId = branch.Id }, CancellationToken.None);
            Assert.Contains("cancelled", r6, StringComparison.OrdinalIgnoreCase);
        }
    }
}
