namespace CodeX.Application.Features.Reports.Queries.GetDailyCollectionReport
{
    public class DailyCollectionReportDto
    {
        public decimal TotalCollection { get; set; }
        public decimal CashCollection { get; set; }
        public decimal UpiCollection { get; set; }
        public decimal CardCollection { get; set; }
        public decimal OnlineCollection { get; set; }
        
        public List<DailyCollectionReportRowDto> DetailedRows { get; set; } = new List<DailyCollectionReportRowDto>();
    }

    public class DailyCollectionReportRowDto
    {
        public Guid PaymentId { get; set; }
        public string InvoiceNumber { get; set; } = string.Empty;
        public string PatientName { get; set; } = string.Empty;
        public DateTime PaymentDate { get; set; }
        public decimal Amount { get; set; }
        public string PaymentMode { get; set; } = string.Empty;
        public string? TransactionId { get; set; }
    }
}
