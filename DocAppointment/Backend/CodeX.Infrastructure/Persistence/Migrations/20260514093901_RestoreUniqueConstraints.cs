using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CodeX.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RestoreUniqueConstraints : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Tokens_QueueId_TokenNumber",
                table: "Tokens");

            migrationBuilder.DropIndex(
                name: "IX_DailyQueues_DoctorId_QueueDate_SessionId",
                table: "DailyQueues");

            migrationBuilder.CreateIndex(
                name: "IX_Tokens_QueueId_TokenNumber",
                table: "Tokens",
                columns: new[] { "QueueId", "TokenNumber" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DailyQueues_DoctorId_QueueDate_SessionId",
                table: "DailyQueues",
                columns: new[] { "DoctorId", "QueueDate", "SessionId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Tokens_QueueId_TokenNumber",
                table: "Tokens");

            migrationBuilder.DropIndex(
                name: "IX_DailyQueues_DoctorId_QueueDate_SessionId",
                table: "DailyQueues");

            migrationBuilder.CreateIndex(
                name: "IX_Tokens_QueueId_TokenNumber",
                table: "Tokens",
                columns: new[] { "QueueId", "TokenNumber" });

            migrationBuilder.CreateIndex(
                name: "IX_DailyQueues_DoctorId_QueueDate_SessionId",
                table: "DailyQueues",
                columns: new[] { "DoctorId", "QueueDate", "SessionId" });
        }
    }
}
