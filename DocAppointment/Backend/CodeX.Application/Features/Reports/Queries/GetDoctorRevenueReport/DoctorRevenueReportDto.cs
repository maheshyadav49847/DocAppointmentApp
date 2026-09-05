namespace CodeX.Application.Features.Reports.Queries.GetDoctorRevenueReport
{
    public class DoctorRevenueReportDto
    {
        public decimal TotalRevenueGenerated { get; set; }
        public decimal TotalRevenueCollected { get; set; }
        public decimal TotalDiscountsGiven { get; set; }
        
        public List<DoctorRevenueReportRowDto> DetailedRows { get; set; } = new List<DoctorRevenueReportRowDto>();
    }

    public class DoctorRevenueReportRowDto
    {
        public Guid InvoiceId { get; set; }
        public string InvoiceNumber { get; set; } = string.Empty;
        public string PatientName { get; set; } = string.Empty;
        public string DoctorName { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal PaidAmount { get; set; }
        public string Status { get; set; } = string.Empty;
    }
}
