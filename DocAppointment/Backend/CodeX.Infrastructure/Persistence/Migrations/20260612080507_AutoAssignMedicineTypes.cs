using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CodeX.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AutoAssignMedicineTypes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                UPDATE ""Medicines"" m
                SET ""MedicineTypeId"" = t.""Id""
                FROM ""MedicineTypes"" t
                WHERE m.""MedicineTypeId"" IS NULL 
                  AND m.""Name"" ILIKE '%' || t.""Name"" || '%';

                UPDATE ""VisitMedicines"" vm
                SET ""MedicineTypeId"" = t.""Id""
                FROM ""MedicineTypes"" t
                WHERE vm.""MedicineTypeId"" IS NULL 
                  AND vm.""MedicineName"" ILIKE '%' || t.""Name"" || '%';
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
