using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CodeX.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class SplitEmergencyContact : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "EmergencyContact",
                table: "Patients",
                newName: "EmergencyContactPhone");

            migrationBuilder.AddColumn<string>(
                name: "EmergencyContactName",
                table: "Patients",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EmergencyContactName",
                table: "Patients");

            migrationBuilder.RenameColumn(
                name: "EmergencyContactPhone",
                table: "Patients",
                newName: "EmergencyContact");
        }
    }
}
