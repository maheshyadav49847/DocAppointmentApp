using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CodeX.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPatientIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Patients_Name",
                table: "Patients",
                column: "Name");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Patients_Name",
                table: "Patients");
        }
    }
}
