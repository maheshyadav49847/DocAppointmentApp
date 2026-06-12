using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CodeX.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddMedicineTypeTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {

            migrationBuilder.AddColumn<Guid>(
                name: "MedicineTypeId",
                table: "Medicines",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "MedicineTypes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uuid", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MedicineTypes", x => x.Id);
                });

            migrationBuilder.Sql(@"
                INSERT INTO ""MedicineTypes"" (""Id"", ""Name"", ""CreatedAt"", ""IsActive"", ""IsDeleted"")
                SELECT DISTINCT gen_random_uuid(), ""Type"", NOW(), true, false
                FROM ""Medicines""
                WHERE ""Type"" IS NOT NULL AND ""Type"" != '';

                UPDATE ""Medicines"" m
                SET ""MedicineTypeId"" = mt.""Id""
                FROM ""MedicineTypes"" mt
                WHERE m.""Type"" = mt.""Name"";
            ");

            migrationBuilder.DropColumn(
                name: "Type",
                table: "Medicines");

            migrationBuilder.CreateIndex(
                name: "IX_Medicines_MedicineTypeId",
                table: "Medicines",
                column: "MedicineTypeId");

            migrationBuilder.AddForeignKey(
                name: "FK_Medicines_MedicineTypes_MedicineTypeId",
                table: "Medicines",
                column: "MedicineTypeId",
                principalTable: "MedicineTypes",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Medicines_MedicineTypes_MedicineTypeId",
                table: "Medicines");

            migrationBuilder.DropTable(
                name: "MedicineTypes");

            migrationBuilder.DropIndex(
                name: "IX_Medicines_MedicineTypeId",
                table: "Medicines");

            migrationBuilder.DropColumn(
                name: "MedicineTypeId",
                table: "Medicines");

            migrationBuilder.AddColumn<string>(
                name: "Type",
                table: "Medicines",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);
        }
    }
}
