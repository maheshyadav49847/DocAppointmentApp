using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CodeX.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class UpdateChatSessionBranchNavigation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Patients_Phone",
                table: "Patients");

            migrationBuilder.CreateIndex(
                name: "IX_Patients_Phone",
                table: "Patients",
                column: "Phone");

            migrationBuilder.CreateIndex(
                name: "IX_Patients_Phone_OrganizationId",
                table: "Patients",
                columns: new[] { "Phone", "OrganizationId" },
                unique: true,
                filter: "\"IsDeleted\" = false AND \"Phone\" IS NOT NULL AND \"Phone\" <> ''");

            migrationBuilder.CreateIndex(
                name: "IX_ChatSessions_BranchId",
                table: "ChatSessions",
                column: "BranchId");

            migrationBuilder.AddForeignKey(
                name: "FK_ChatSessions_Branches_BranchId",
                table: "ChatSessions",
                column: "BranchId",
                principalTable: "Branches",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ChatSessions_Branches_BranchId",
                table: "ChatSessions");

            migrationBuilder.DropIndex(
                name: "IX_Patients_Phone",
                table: "Patients");

            migrationBuilder.DropIndex(
                name: "IX_Patients_Phone_OrganizationId",
                table: "Patients");

            migrationBuilder.DropIndex(
                name: "IX_ChatSessions_BranchId",
                table: "ChatSessions");

            migrationBuilder.CreateIndex(
                name: "IX_Patients_Phone",
                table: "Patients",
                column: "Phone",
                unique: true,
                filter: "\"IsDeleted\" = false AND \"Phone\" IS NOT NULL AND \"Phone\" <> ''");
        }
    }
}
