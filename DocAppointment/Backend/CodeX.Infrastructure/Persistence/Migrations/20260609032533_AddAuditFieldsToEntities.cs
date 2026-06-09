using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CodeX.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddAuditFieldsToEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CreatedBy",
                table: "VisitMedicines",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "UpdatedBy",
                table: "VisitMedicines",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CreatedBy",
                table: "Tokens",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "UpdatedBy",
                table: "Tokens",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CreatedBy",
                table: "Staff",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "UpdatedBy",
                table: "Staff",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CreatedBy",
                table: "Sessions",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "UpdatedBy",
                table: "Sessions",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CreatedBy",
                table: "Ratings",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "UpdatedBy",
                table: "Ratings",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CreatedBy",
                table: "PatientVisits",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "UpdatedBy",
                table: "PatientVisits",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CreatedBy",
                table: "Patients",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "UpdatedBy",
                table: "Patients",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CreatedBy",
                table: "PatientAttachments",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "UpdatedBy",
                table: "PatientAttachments",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CreatedBy",
                table: "Organizations",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "UpdatedBy",
                table: "Organizations",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CreatedBy",
                table: "MessageLogs",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "UpdatedBy",
                table: "MessageLogs",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CreatedBy",
                table: "Medicines",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "UpdatedBy",
                table: "Medicines",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CreatedBy",
                table: "FollowUps",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "UpdatedBy",
                table: "FollowUps",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CreatedBy",
                table: "Doctors",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "UpdatedBy",
                table: "Doctors",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CreatedBy",
                table: "DailyQueues",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "UpdatedBy",
                table: "DailyQueues",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CreatedBy",
                table: "ChatSessions",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "UpdatedBy",
                table: "ChatSessions",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CreatedBy",
                table: "Branches",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "UpdatedBy",
                table: "Branches",
                type: "uuid",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "VisitMedicines");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                table: "VisitMedicines");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "Tokens");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                table: "Tokens");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "Staff");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                table: "Staff");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "Sessions");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                table: "Sessions");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "Ratings");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                table: "Ratings");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "PatientVisits");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                table: "PatientVisits");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "Patients");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                table: "Patients");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "PatientAttachments");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                table: "PatientAttachments");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "Organizations");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                table: "Organizations");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "MessageLogs");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                table: "MessageLogs");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "Medicines");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                table: "Medicines");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "FollowUps");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                table: "FollowUps");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "Doctors");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                table: "Doctors");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "DailyQueues");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                table: "DailyQueues");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "ChatSessions");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                table: "ChatSessions");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "Branches");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                table: "Branches");
        }
    }
}
