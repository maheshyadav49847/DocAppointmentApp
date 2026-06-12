using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CodeX.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class UpdateVisitMedicineType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {

            migrationBuilder.AddColumn<Guid>(
                name: "MedicineTypeId",
                table: "VisitMedicines",
                type: "uuid",
                nullable: true);

            migrationBuilder.Sql(@"
                INSERT INTO ""MedicineTypes"" (""Id"", ""Name"", ""CreatedAt"", ""IsActive"", ""IsDeleted"")
                SELECT DISTINCT gen_random_uuid(), ""MedicineType"", NOW(), true, false
                FROM ""VisitMedicines"" vm
                WHERE ""MedicineType"" IS NOT NULL AND ""MedicineType"" != ''
                  AND NOT EXISTS (SELECT 1 FROM ""MedicineTypes"" mt WHERE mt.""Name"" = vm.""MedicineType"");

                UPDATE ""VisitMedicines"" vm
                SET ""MedicineTypeId"" = mt.""Id""
                FROM ""MedicineTypes"" mt
                WHERE vm.""MedicineType"" = mt.""Name"";
            ");

            migrationBuilder.DropColumn(
                name: "MedicineType",
                table: "VisitMedicines");

            migrationBuilder.CreateIndex(
                name: "IX_VisitMedicines_MedicineTypeId",
                table: "VisitMedicines",
                column: "MedicineTypeId");

            migrationBuilder.AddForeignKey(
                name: "FK_VisitMedicines_MedicineTypes_MedicineTypeId",
                table: "VisitMedicines",
                column: "MedicineTypeId",
                principalTable: "MedicineTypes",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_VisitMedicines_MedicineTypes_MedicineTypeId",
                table: "VisitMedicines");

            migrationBuilder.DropIndex(
                name: "IX_VisitMedicines_MedicineTypeId",
                table: "VisitMedicines");

            migrationBuilder.DropColumn(
                name: "MedicineTypeId",
                table: "VisitMedicines");

            migrationBuilder.AddColumn<string>(
                name: "MedicineType",
                table: "VisitMedicines",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);
        }
    }
}
