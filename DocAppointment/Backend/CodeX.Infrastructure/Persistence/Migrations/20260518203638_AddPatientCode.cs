using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CodeX.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPatientCode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Patients_Phone",
                table: "Patients");

            migrationBuilder.DropIndex(
                name: "IX_Organizations_Slug",
                table: "Organizations");

            migrationBuilder.DropIndex(
                name: "IX_DailyQueues_DoctorId_QueueDate_SessionId",
                table: "DailyQueues");

            migrationBuilder.DropIndex(
                name: "IX_Branches_WhatsAppNumber",
                table: "Branches");

            migrationBuilder.AddColumn<string>(
                name: "PatientCode",
                table: "Patients",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_Patients_Phone",
                table: "Patients",
                column: "Phone",
                unique: true,
                filter: "\"IsDeleted\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_Organizations_Slug",
                table: "Organizations",
                column: "Slug",
                unique: true,
                filter: "\"IsDeleted\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_DailyQueues_DoctorId_QueueDate_SessionId",
                table: "DailyQueues",
                columns: new[] { "DoctorId", "QueueDate", "SessionId" },
                unique: true,
                filter: "\"IsDeleted\" = false");

            migrationBuilder.CreateIndex(
                name: "IX_Branches_WhatsAppNumber",
                table: "Branches",
                column: "WhatsAppNumber",
                unique: true,
                filter: "\"IsDeleted\" = false");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Patients_Phone",
                table: "Patients");

            migrationBuilder.DropIndex(
                name: "IX_Organizations_Slug",
                table: "Organizations");

            migrationBuilder.DropIndex(
                name: "IX_DailyQueues_DoctorId_QueueDate_SessionId",
                table: "DailyQueues");

            migrationBuilder.DropIndex(
                name: "IX_Branches_WhatsAppNumber",
                table: "Branches");

            migrationBuilder.DropColumn(
                name: "PatientCode",
                table: "Patients");

            migrationBuilder.CreateIndex(
                name: "IX_Patients_Phone",
                table: "Patients",
                column: "Phone",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Organizations_Slug",
                table: "Organizations",
                column: "Slug");

            migrationBuilder.CreateIndex(
                name: "IX_DailyQueues_DoctorId_QueueDate_SessionId",
                table: "DailyQueues",
                columns: new[] { "DoctorId", "QueueDate", "SessionId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Branches_WhatsAppNumber",
                table: "Branches",
                column: "WhatsAppNumber",
                unique: true);
        }
    }
}
