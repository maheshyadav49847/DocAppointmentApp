using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CodeX.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class MoveDoctorToOrgLevelFinal : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Clear existing data to avoid FK conflicts with new OrgLevel doctors
            migrationBuilder.Sql("TRUNCATE TABLE \"Tokens\", \"DailyQueues\", \"Sessions\", \"Doctors\" RESTART IDENTITY CASCADE;");

            migrationBuilder.DropForeignKey(
                name: "FK_Doctors_Branches_BranchId",
                table: "Doctors");

            migrationBuilder.RenameColumn(
                name: "BranchId",
                table: "Doctors",
                newName: "OrganizationId");

            migrationBuilder.RenameIndex(
                name: "IX_Doctors_BranchId",
                table: "Doctors",
                newName: "IX_Doctors_OrganizationId");

            migrationBuilder.AddColumn<Guid>(
                name: "BranchId",
                table: "Sessions",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateTable(
                name: "DoctorBranches",
                columns: table => new
                {
                    BranchesId = table.Column<Guid>(type: "uuid", nullable: false),
                    DoctorsId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DoctorBranches", x => new { x.BranchesId, x.DoctorsId });
                    table.ForeignKey(
                        name: "FK_DoctorBranches_Branches_BranchesId",
                        column: x => x.BranchesId,
                        principalTable: "Branches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DoctorBranches_Doctors_DoctorsId",
                        column: x => x.DoctorsId,
                        principalTable: "Doctors",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Sessions_BranchId",
                table: "Sessions",
                column: "BranchId");

            migrationBuilder.CreateIndex(
                name: "IX_DoctorBranches_DoctorsId",
                table: "DoctorBranches",
                column: "DoctorsId");

            migrationBuilder.AddForeignKey(
                name: "FK_Doctors_Organizations_OrganizationId",
                table: "Doctors",
                column: "OrganizationId",
                principalTable: "Organizations",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Sessions_Branches_BranchId",
                table: "Sessions",
                column: "BranchId",
                principalTable: "Branches",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Doctors_Organizations_OrganizationId",
                table: "Doctors");

            migrationBuilder.DropForeignKey(
                name: "FK_Sessions_Branches_BranchId",
                table: "Sessions");

            migrationBuilder.DropTable(
                name: "DoctorBranches");

            migrationBuilder.DropIndex(
                name: "IX_Sessions_BranchId",
                table: "Sessions");

            migrationBuilder.DropColumn(
                name: "BranchId",
                table: "Sessions");

            migrationBuilder.RenameColumn(
                name: "OrganizationId",
                table: "Doctors",
                newName: "BranchId");

            migrationBuilder.RenameIndex(
                name: "IX_Doctors_OrganizationId",
                table: "Doctors",
                newName: "IX_Doctors_BranchId");

            migrationBuilder.AddForeignKey(
                name: "FK_Doctors_Branches_BranchId",
                table: "Doctors",
                column: "BranchId",
                principalTable: "Branches",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
