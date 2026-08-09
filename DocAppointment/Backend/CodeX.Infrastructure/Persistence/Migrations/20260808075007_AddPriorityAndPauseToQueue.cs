using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CodeX.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPriorityAndPauseToQueue : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsPriority",
                table: "Tokens",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "PauseReason",
                table: "DailyQueues",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PausedUntil",
                table: "DailyQueues",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsPriority",
                table: "Tokens");

            migrationBuilder.DropColumn(
                name: "PauseReason",
                table: "DailyQueues");

            migrationBuilder.DropColumn(
                name: "PausedUntil",
                table: "DailyQueues");
        }
    }
}
