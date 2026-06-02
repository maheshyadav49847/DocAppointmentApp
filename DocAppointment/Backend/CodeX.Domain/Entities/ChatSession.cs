using CodeX.Domain.Common;

namespace CodeX.Domain.Entities
{
    public class ChatSession : BaseEntity
    {
        public string PhoneNumber { get; set; } = string.Empty;
        public Guid? BranchId { get; set; }
        public string CurrentState { get; set; } = "START";
        public Guid? SelectedDoctorId { get; set; }
        public Guid? SelectedSessionId { get; set; }
        public string? LastMessage { get; set; }
        public string Language { get; set; } = string.Empty;
    }
}
