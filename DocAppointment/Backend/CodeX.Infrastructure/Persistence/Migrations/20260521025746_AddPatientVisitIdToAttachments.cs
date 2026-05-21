using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CodeX.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPatientVisitIdToAttachments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "PatientVisitId",
                table: "PatientAttachments",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_PatientAttachments_PatientVisitId",
                table: "PatientAttachments",
                column: "PatientVisitId");

            migrationBuilder.AddForeignKey(
                name: "FK_PatientAttachments_PatientVisits_PatientVisitId",
                table: "PatientAttachments",
                column: "PatientVisitId",
                principalTable: "PatientVisits",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PatientAttachments_PatientVisits_PatientVisitId",
                table: "PatientAttachments");

            migrationBuilder.DropIndex(
                name: "IX_PatientAttachments_PatientVisitId",
                table: "PatientAttachments");

            migrationBuilder.DropColumn(
                name: "PatientVisitId",
                table: "PatientAttachments");
        }
    }
}
