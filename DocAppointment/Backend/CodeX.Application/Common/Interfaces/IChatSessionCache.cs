using CodeX.Domain.Entities;

namespace CodeX.Application.Common.Interfaces
{
    public interface IChatSessionCache
    {
        Task<ChatSession?> GetSessionAsync(string phoneNumber, Guid? branchId, CancellationToken ct);
        void SetSession(ChatSession session);
        IEnumerable<ChatSession> GetDirtySessionsAndClear();
    }
}
