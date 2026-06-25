using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using CodeX.Domain.Entities;
using System;

namespace CodeX.Application.Common.Interfaces
{
    public interface IChatSessionCache
    {
        Task<ChatSession?> GetSessionAsync(string phoneNumber, Guid? branchId, CancellationToken ct);
        void SetSession(ChatSession session);
        IEnumerable<ChatSession> GetDirtySessionsAndClear();
    }
}
