using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace CodeX.Api.BackgroundServices
{
    public class ChatSessionPersistenceService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<ChatSessionPersistenceService> _logger;
        private readonly TimeSpan _flushInterval = TimeSpan.FromSeconds(30);

        public ChatSessionPersistenceService(IServiceProvider serviceProvider, ILogger<ChatSessionPersistenceService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await FlushDirtySessionsAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error flushing chat sessions to database.");
                }

                await Task.Delay(_flushInterval, stoppingToken);
            }
        }

        private async Task FlushDirtySessionsAsync(CancellationToken stoppingToken)
        {
            using var scope = _serviceProvider.CreateScope();
            var cache = scope.ServiceProvider.GetRequiredService<IChatSessionCache>();
            var context = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();

            var dirtySessions = cache.GetDirtySessionsAndClear().ToList();
            if (!dirtySessions.Any()) return;

            foreach (var session in dirtySessions)
            {
                // Find existing
                var existing = await context.ChatSessions
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(s => s.PhoneNumber == session.PhoneNumber && s.BranchId == session.BranchId, stoppingToken);

                if (existing == null)
                {
                    context.ChatSessions.Add(session);
                }
                else
                {
                    // Update state
                    existing.CurrentState = session.CurrentState;
                    existing.LastMessage = session.LastMessage;
                    existing.Language = session.Language;
                    existing.SelectedDoctorId = session.SelectedDoctorId;
                    existing.SelectedSessionId = session.SelectedSessionId;
                    context.ChatSessions.Update(existing);
                }
            }

            await context.SaveChangesAsync(stoppingToken);
            _logger.LogInformation("Flushed {Count} dirty chat sessions to database.", dirtySessions.Count);
        }
    }
}
