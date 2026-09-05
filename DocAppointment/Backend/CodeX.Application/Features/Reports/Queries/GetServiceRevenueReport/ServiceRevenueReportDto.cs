namespace CodeX.Application.Features.Reports.Queries.GetServiceRevenueReport
{
    public class ServiceRevenueReportDto
    {
        public decimal TotalServiceRevenue { get; set; }
        public int TotalServicesPerformed { get; set; }
        
        public List<ServiceRevenueReportRowDto> DetailedRows { get; set; } = new List<ServiceRevenueReportRowDto>();
    }

    public class ServiceRevenueReportRowDto
    {
        public string ServiceName { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public int TotalQuantity { get; set; }
        public decimal TotalRevenue { get; set; }
    }
}
