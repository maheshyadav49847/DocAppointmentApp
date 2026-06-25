using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CodeX.Application.Common.Interfaces;
using CodeX.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;

namespace CodeX.Infrastructure.Services
{
    public class ChatSessionCache : IChatSessionCache
    {
        private readonly IMemoryCache _memoryCache;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ConcurrentDictionary<string, ChatSession> _dirtySessions = new();

        public ChatSessionCache(IMemoryCache memoryCache, IServiceScopeFactory scopeFactory)
        {
            _memoryCache = memoryCache;
            _scopeFactory = scopeFactory;
        }

        private static string GetCacheKey(string phone, Guid? branchId) => $"chat_session_{phone}_{branchId}";

        public async Task<ChatSession?> GetSessionAsync(string phoneNumber, Guid? branchId, CancellationToken ct)
        {
            var cacheKey = GetCacheKey(phoneNumber, branchId);

            if (!_memoryCache.TryGetValue(cacheKey, out ChatSession? session))
            {
                using var scope = _scopeFactory.CreateScope();
                var context = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
                
                // IgnoreQueryFilters to get the session across branches if needed, though we strictly filter by BranchId
                session = await context.ChatSessions
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(x => x.PhoneNumber == phoneNumber && x.BranchId == branchId, ct);

                if (session != null)
                {
                    SetCacheOnly(session);
                }
            }

            return session;
        }

        public void SetSession(ChatSession session)
        {
            SetCacheOnly(session);
            
            // Mark as dirty so background service persists it
            var cacheKey = GetCacheKey(session.PhoneNumber, session.BranchId);
            _dirtySessions.AddOrUpdate(cacheKey, session, (_, _) => session);
        }

        private void SetCacheOnly(ChatSession session)
        {
            var cacheKey = GetCacheKey(session.PhoneNumber, session.BranchId);
            var cacheOptions = new MemoryCacheEntryOptions()
                .SetAbsoluteExpiration(TimeSpan.FromHours(24));
                
            _memoryCache.Set(cacheKey, session, cacheOptions);
        }

        public IEnumerable<ChatSession> GetDirtySessionsAndClear()
        {
            var dirtyKeys = _dirtySessions.Keys.ToList();
            var sessionsToSave = new List<ChatSession>();

            foreach (var key in dirtyKeys)
            {
                if (_dirtySessions.TryRemove(key, out var session))
                {
                    sessionsToSave.Add(session);
                }
            }

            return sessionsToSave;
        }
    }
}
