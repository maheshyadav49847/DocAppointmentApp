using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CodeX.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RemoveUniqueConstraints : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Tokens_QueueId_TokenNumber",
                table: "Tokens");

            migrationBuilder.DropIndex(
                name: "IX_Staff_Email",
                table: "Staff");

            migrationBuilder.DropIndex(
                name: "IX_Organizations_Slug",
                table: "Organizations");

            migrationBuilder.DropIndex(
                name: "IX_Doctors_RegistrationNumber",
                table: "Doctors");

            migrationBuilder.DropIndex(
                name: "IX_DailyQueues_DoctorId_QueueDate_SessionId",
                table: "DailyQueues");

            migrationBuilder.CreateIndex(
                name: "IX_Tokens_QueueId_TokenNumber",
                table: "Tokens",
                columns: new[] { "QueueId", "TokenNumber" });

            migrationBuilder.CreateIndex(
                name: "IX_Staff_Email",
                table: "Staff",
                column: "Email");

            migrationBuilder.CreateIndex(
                name: "IX_Organizations_Slug",
                table: "Organizations",
                column: "Slug");

            migrationBuilder.CreateIndex(
                name: "IX_Doctors_RegistrationNumber",
                table: "Doctors",
                column: "RegistrationNumber",
                filter: "\"RegistrationNumber\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_DailyQueues_DoctorId_QueueDate_SessionId",
                table: "DailyQueues",
                columns: new[] { "DoctorId", "QueueDate", "SessionId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Tokens_QueueId_TokenNumber",
                table: "Tokens");

            migrationBuilder.DropIndex(
                name: "IX_Staff_Email",
                table: "Staff");

            migrationBuilder.DropIndex(
                name: "IX_Organizations_Slug",
                table: "Organizations");

            migrationBuilder.DropIndex(
                name: "IX_Doctors_RegistrationNumber",
                table: "Doctors");

            migrationBuilder.DropIndex(
                name: "IX_DailyQueues_DoctorId_QueueDate_SessionId",
                table: "DailyQueues");

            migrationBuilder.CreateIndex(
                name: "IX_Tokens_QueueId_TokenNumber",
                table: "Tokens",
                columns: new[] { "QueueId", "TokenNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Staff_Email",
                table: "Staff",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Organizations_Slug",
                table: "Organizations",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Doctors_RegistrationNumber",
                table: "Doctors",
                column: "RegistrationNumber",
                unique: true,
                filter: "\"RegistrationNumber\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_DailyQueues_DoctorId_QueueDate_SessionId",
                table: "DailyQueues",
                columns: new[] { "DoctorId", "QueueDate", "SessionId" },
                unique: true);
        }
    }
}
