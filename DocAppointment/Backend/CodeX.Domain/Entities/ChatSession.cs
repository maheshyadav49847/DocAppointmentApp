using CodeX.Domain.Common;

namespace CodeX.Domain.Entities
{
    public class ChatSession : BaseEntity
    {
        public string PhoneNumber { get; set; } = string.Empty;
        public string CurrentState { get; set; } = "START"; // START, SELECT_DOCTOR, SELECT_SESSION, CONFIRM
        public Guid? SelectedDoctorId { get; set; }
        public Guid? SelectedSessionId { get; set; }
        public string? LastMessage { get; set; }
    }
}
