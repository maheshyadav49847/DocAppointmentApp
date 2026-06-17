using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CodeX.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddDoctorIdToStaff : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "DoctorId",
                table: "Staff",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Staff_DoctorId",
                table: "Staff",
                column: "DoctorId");

            migrationBuilder.AddForeignKey(
                name: "FK_Staff_Doctors_DoctorId",
                table: "Staff",
                column: "DoctorId",
                principalTable: "Doctors",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Staff_Doctors_DoctorId",
                table: "Staff");

            migrationBuilder.DropIndex(
                name: "IX_Staff_DoctorId",
                table: "Staff");

            migrationBuilder.DropColumn(
                name: "DoctorId",
                table: "Staff");
        }
    }
}
