using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CodeX.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddDialCodesToEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PhoneNumberDialCode",
                table: "Staff",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "EmergencyContactPhoneDialCode",
                table: "Patients",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PhoneDialCode",
                table: "Patients",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MobileDialCode",
                table: "Doctors",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WhatsAppDialCode",
                table: "Branches",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PhoneNumberDialCode",
                table: "Staff");

            migrationBuilder.DropColumn(
                name: "EmergencyContactPhoneDialCode",
                table: "Patients");

            migrationBuilder.DropColumn(
                name: "PhoneDialCode",
                table: "Patients");

            migrationBuilder.DropColumn(
                name: "MobileDialCode",
                table: "Doctors");

            migrationBuilder.DropColumn(
                name: "WhatsAppDialCode",
                table: "Branches");
        }
    }
}
