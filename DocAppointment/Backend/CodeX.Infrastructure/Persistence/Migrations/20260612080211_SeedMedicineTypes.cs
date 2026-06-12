using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CodeX.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class SeedMedicineTypes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                INSERT INTO ""MedicineTypes"" (""Id"", ""Name"", ""CreatedAt"", ""IsActive"", ""IsDeleted"")
                SELECT gen_random_uuid(), v.Name, NOW(), true, false
                FROM (
                  VALUES 
                    ('Tablet'), ('Injection'), ('Capsule'), ('Syrup'), ('Drops'), 
                    ('Cream'), ('Gel'), ('Ointment'), ('Lotion'), ('Inhaler')
                ) AS v(Name)
                WHERE NOT EXISTS (
                  SELECT 1 FROM ""MedicineTypes"" mt WHERE mt.""Name"" = v.Name
                );
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                DELETE FROM ""MedicineTypes"" 
                WHERE ""Name"" IN ('Tablet', 'Injection', 'Capsule', 'Syrup', 'Drops', 'Cream', 'Gel', 'Ointment', 'Lotion', 'Inhaler');
            ");
        }
    }
}
