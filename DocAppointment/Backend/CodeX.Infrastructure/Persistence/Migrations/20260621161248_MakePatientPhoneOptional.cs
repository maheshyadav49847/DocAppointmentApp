using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CodeX.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class MakePatientPhoneOptional : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Patients_Phone",
                table: "Patients");

            migrationBuilder.AlterColumn<string>(
                name: "Phone",
                table: "Patients",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50);

            migrationBuilder.CreateIndex(
                name: "IX_Patients_Phone",
                table: "Patients",
                column: "Phone",
                unique: true,
                filter: "\"IsDeleted\" = false AND \"Phone\" IS NOT NULL AND \"Phone\" <> ''");

            migrationBuilder.CreateIndex(
                name: "IX_FollowUps_PatientVisitId",
                table: "FollowUps",
                column: "PatientVisitId");

            migrationBuilder.AddForeignKey(
                name: "FK_FollowUps_PatientVisits_PatientVisitId",
                table: "FollowUps",
                column: "PatientVisitId",
                principalTable: "PatientVisits",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_FollowUps_PatientVisits_PatientVisitId",
                table: "FollowUps");

            migrationBuilder.DropIndex(
                name: "IX_Patients_Phone",
                table: "Patients");

            migrationBuilder.DropIndex(
                name: "IX_FollowUps_PatientVisitId",
                table: "FollowUps");

            migrationBuilder.AlterColumn<string>(
                name: "Phone",
                table: "Patients",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50,
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Patients_Phone",
                table: "Patients",
                column: "Phone",
                unique: true,
                filter: "\"IsDeleted\" = false");
        }
    }
}
