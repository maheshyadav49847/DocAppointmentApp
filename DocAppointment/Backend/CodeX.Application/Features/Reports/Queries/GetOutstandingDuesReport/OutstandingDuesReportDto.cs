namespace CodeX.Application.Features.Reports.Queries.GetOutstandingDuesReport
{
    public class OutstandingDuesReportDto
    {
        public decimal TotalOutstandingAmount { get; set; }
        public int TotalOutstandingInvoices { get; set; }
        
        public List<OutstandingDuesReportRowDto> DetailedRows { get; set; } = new List<OutstandingDuesReportRowDto>();
    }

    public class OutstandingDuesReportRowDto
    {
        public Guid InvoiceId { get; set; }
        public string InvoiceNumber { get; set; } = string.Empty;
        public string PatientName { get; set; } = string.Empty;
        public string? PatientPhone { get; set; }
        public DateTime Date { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal PendingAmount { get; set; }
        public int DaysOverdue { get; set; }
    }
}
