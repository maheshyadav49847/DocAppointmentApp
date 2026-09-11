using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CodeX.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddChannelPriorityToOutbox : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_OutboxMessages_Status_CreatedAt",
                table: "OutboxMessages");

            migrationBuilder.AddColumn<int>(
                name: "Priority",
                table: "OutboxMessages",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_OutboxMessages_Channel_Status_Priority_CreatedAt",
                table: "OutboxMessages",
                columns: new[] { "Channel", "Status", "Priority", "CreatedAt", "NextRetryAtUtc", "IsDeleted" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_OutboxMessages_Channel_Status_Priority_CreatedAt",
                table: "OutboxMessages");

            migrationBuilder.DropColumn(
                name: "Priority",
                table: "OutboxMessages");

            migrationBuilder.CreateIndex(
                name: "IX_OutboxMessages_Status_CreatedAt",
                table: "OutboxMessages",
                columns: new[] { "Status", "CreatedAt", "NextRetryAtUtc", "IsDeleted" });
        }
    }
}
