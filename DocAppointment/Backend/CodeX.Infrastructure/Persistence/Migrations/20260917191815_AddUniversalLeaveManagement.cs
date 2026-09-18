using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CodeX.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddUniversalLeaveManagement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "LeaveRecords",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OrganizationId = table.Column<Guid>(type: "uuid", nullable: false),
                    BranchId = table.Column<Guid>(type: "uuid", nullable: true),
                    StaffId = table.Column<Guid>(type: "uuid", nullable: true),
                    DoctorId = table.Column<Guid>(type: "uuid", nullable: true),
                    LeaveType = table.Column<int>(type: "integer", nullable: false),
                    StartDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EndDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    SessionId = table.Column<Guid>(type: "uuid", nullable: true),
                    Reason = table.Column<string>(type: "text", nullable: false),
                    PublicNotice = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    AppliedByStaffId = table.Column<Guid>(type: "uuid", nullable: false),
                    ApprovedByStaffId = table.Column<Guid>(type: "uuid", nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RejectionReason = table.Column<string>(type: "text", nullable: true),
                    NotifyPatients = table.Column<bool>(type: "boolean", nullable: false),
                    AffectedTokensCount = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LeaveRecords", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LeaveRecords_Branches_BranchId",
                        column: x => x.BranchId,
                        principalTable: "Branches",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_LeaveRecords_Doctors_DoctorId",
                        column: x => x.DoctorId,
                        principalTable: "Doctors",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_LeaveRecords_Organizations_OrganizationId",
                        column: x => x.OrganizationId,
                        principalTable: "Organizations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_LeaveRecords_Sessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "Sessions",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_LeaveRecords_Staff_StaffId",
                        column: x => x.StaffId,
                        principalTable: "Staff",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_LeaveRecords_BranchId",
                table: "LeaveRecords",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_LeaveRecords_Doctor_Dates_Status",
                table: "LeaveRecords",
                columns: new[] { "OrganizationId", "DoctorId", "StartDate", "EndDate", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_LeaveRecords_DoctorId",
                table: "LeaveRecords",
                column: "DoctorId");

            migrationBuilder.CreateIndex(
                name: "IX_LeaveRecords_SessionId",
                table: "LeaveRecords",
                column: "SessionId");

            migrationBuilder.CreateIndex(
                name: "IX_LeaveRecords_Staff_Dates_Status",
                table: "LeaveRecords",
                columns: new[] { "OrganizationId", "StaffId", "StartDate", "EndDate", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_LeaveRecords_StaffId",
                table: "LeaveRecords",
                column: "StaffId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LeaveRecords");
        }
    }
}
