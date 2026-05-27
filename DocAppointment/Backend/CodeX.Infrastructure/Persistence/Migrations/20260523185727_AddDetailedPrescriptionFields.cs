using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CodeX.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddDetailedPrescriptionFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ClinicalInstructions",
                table: "VisitMedicines",
                type: "character varying(250)",
                maxLength: 250,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CourseDuration",
                table: "VisitMedicines",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DoseQty",
                table: "VisitMedicines",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DoseSchedule",
                table: "VisitMedicines",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FoodTiming",
                table: "VisitMedicines",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MedicineType",
                table: "VisitMedicines",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ClinicalInstructions",
                table: "VisitMedicines");

            migrationBuilder.DropColumn(
                name: "CourseDuration",
                table: "VisitMedicines");

            migrationBuilder.DropColumn(
                name: "DoseQty",
                table: "VisitMedicines");

            migrationBuilder.DropColumn(
                name: "DoseSchedule",
                table: "VisitMedicines");

            migrationBuilder.DropColumn(
                name: "FoodTiming",
                table: "VisitMedicines");

            migrationBuilder.DropColumn(
                name: "MedicineType",
                table: "VisitMedicines");
        }
    }
}
