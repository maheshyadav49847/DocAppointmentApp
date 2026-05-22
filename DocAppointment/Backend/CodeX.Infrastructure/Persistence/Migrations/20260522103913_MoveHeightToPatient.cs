using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CodeX.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class MoveHeightToPatient : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Height",
                table: "PatientVisits");

            migrationBuilder.AddColumn<decimal>(
                name: "Height",
                table: "Patients",
                type: "numeric",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Height",
                table: "Patients");

            migrationBuilder.AddColumn<decimal>(
                name: "Height",
                table: "PatientVisits",
                type: "numeric",
                nullable: true);
        }
    }
}
