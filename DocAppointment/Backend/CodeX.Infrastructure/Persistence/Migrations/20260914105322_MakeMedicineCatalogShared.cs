using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CodeX.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class MakeMedicineCatalogShared : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                DO $$
                BEGIN
                    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_Medicines_Organizations_OrganizationId') THEN
                        ALTER TABLE ""Medicines"" DROP CONSTRAINT ""FK_Medicines_Organizations_OrganizationId"";
                    END IF;
                END $$;
            ");

            migrationBuilder.AlterColumn<Guid>(
                name: "OrganizationId",
                table: "Medicines",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.Sql(@"
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_Medicines_Organizations_OrganizationId') THEN
                        ALTER TABLE ""Medicines"" ADD CONSTRAINT ""FK_Medicines_Organizations_OrganizationId""
                        FOREIGN KEY (""OrganizationId"") REFERENCES ""Organizations"" (""Id"") ON DELETE SET NULL;
                    END IF;
                END $$;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Medicines_Organizations_OrganizationId",
                table: "Medicines");

            migrationBuilder.AlterColumn<Guid>(
                name: "OrganizationId",
                table: "Medicines",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Medicines_Organizations_OrganizationId",
                table: "Medicines",
                column: "OrganizationId",
                principalTable: "Organizations",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
