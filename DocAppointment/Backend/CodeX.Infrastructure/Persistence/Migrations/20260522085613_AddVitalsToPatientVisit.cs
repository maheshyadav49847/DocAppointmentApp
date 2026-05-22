using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CodeX.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddVitalsToPatientVisit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BloodPressure",
                table: "PatientVisits",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "BloodSugar",
                table: "PatientVisits",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "HeartRate",
                table: "PatientVisits",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Height",
                table: "PatientVisits",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "OxygenLevel",
                table: "PatientVisits",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RespiratoryRate",
                table: "PatientVisits",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Temperature",
                table: "PatientVisits",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Weight",
                table: "PatientVisits",
                type: "numeric",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BloodPressure",
                table: "PatientVisits");

            migrationBuilder.DropColumn(
                name: "BloodSugar",
                table: "PatientVisits");

            migrationBuilder.DropColumn(
                name: "HeartRate",
                table: "PatientVisits");

            migrationBuilder.DropColumn(
                name: "Height",
                table: "PatientVisits");

            migrationBuilder.DropColumn(
                name: "OxygenLevel",
                table: "PatientVisits");

            migrationBuilder.DropColumn(
                name: "RespiratoryRate",
                table: "PatientVisits");

            migrationBuilder.DropColumn(
                name: "Temperature",
                table: "PatientVisits");

            migrationBuilder.DropColumn(
                name: "Weight",
                table: "PatientVisits");
        }
    }
}
