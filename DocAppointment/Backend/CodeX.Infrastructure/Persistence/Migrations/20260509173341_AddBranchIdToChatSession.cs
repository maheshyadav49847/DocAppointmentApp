using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CodeX.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddBranchIdToChatSession : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "BranchId",
                table: "ChatSessions",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ChatSessions_PhoneNumber_BranchId",
                table: "ChatSessions",
                columns: new[] { "PhoneNumber", "BranchId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ChatSessions_PhoneNumber_BranchId",
                table: "ChatSessions");

            migrationBuilder.DropColumn(
                name: "BranchId",
                table: "ChatSessions");

            migrationBuilder.CreateIndex(
                name: "IX_ChatSessions_PhoneNumber",
                table: "ChatSessions",
                column: "PhoneNumber",
                unique: true);
        }
    }
}
