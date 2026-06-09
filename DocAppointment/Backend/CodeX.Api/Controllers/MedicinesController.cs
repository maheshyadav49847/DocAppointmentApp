using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using CodeX.Application.Features.Medicines.Commands;
using CodeX.Application.Features.Medicines.Queries;
using CsvHelper;
using CsvHelper.Configuration;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace CodeX.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class MedicinesController : ControllerBase
    {
        private readonly IMediator _mediator;

        public MedicinesController(IMediator mediator)
        {
            _mediator = mediator;
        }

        private Guid GetOrganizationId()
        {
            var orgIdClaim = User.FindFirst("OrganizationId")?.Value;
            if (string.IsNullOrEmpty(orgIdClaim) || !Guid.TryParse(orgIdClaim, out var orgId))
            {
                throw new UnauthorizedAccessException("Organization context not found in token.");
            }
            return orgId;
        }

        private Guid GetUserId()
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value 
                ?? User.FindFirst("id")?.Value 
                ?? User.FindFirst("sub")?.Value;
                
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            {
                throw new UnauthorizedAccessException("User context not found in token.");
            }
            return userId;
        }

        [HttpGet]
        public async Task<IActionResult> GetMedicines([FromQuery] string? search, [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 50)
        {
            var query = new GetMedicinesQuery
            {
                OrganizationId = GetOrganizationId(),
                SearchTerm = search,
                PageNumber = pageNumber,
                PageSize = pageSize
            };
            var result = await _mediator.Send(query);
            return Ok(result);
        }

        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetMedicineById(Guid id)
        {
            var query = new GetMedicineByIdQuery
            {
                Id = id,
                OrganizationId = GetOrganizationId()
            };
            var result = await _mediator.Send(query);
            return Ok(result);
        }

        [HttpPost]
        public async Task<IActionResult> CreateMedicine([FromBody] CreateMedicineCommand command)
        {
            command.OrganizationId = GetOrganizationId();
            var id = await _mediator.Send(command);
            return CreatedAtAction(nameof(GetMedicineById), new { id }, id);
        }

        [HttpPut("{id:guid}")]
        public async Task<IActionResult> UpdateMedicine(Guid id, [FromBody] UpdateMedicineCommand command)
        {
            if (id != command.Id)
            {
                return BadRequest("ID mismatch");
            }
            command.OrganizationId = GetOrganizationId();
            await _mediator.Send(command);
            return NoContent();
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> DeleteMedicine(Guid id)
        {
            var command = new DeleteMedicineCommand
            {
                Id = id,
                OrganizationId = GetOrganizationId()
            };
            await _mediator.Send(command);
            return NoContent();
        }

        [HttpPost("import")]
        public async Task<IActionResult> ImportMedicines(IFormFile file)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest("File is not selected or empty");
            }

            try
            {
                using var reader = new StreamReader(file.OpenReadStream());
                using var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture)
                {
                    HeaderValidated = null,
                    MissingFieldFound = null,
                    IgnoreBlankLines = true
                });

                var records = csv.GetRecords<MedicineImportDto>().ToList();

                var command = new ImportMedicinesCommand
                {
                    OrganizationId = GetOrganizationId(),
                    UserId = GetUserId(),
                    Medicines = records
                };

                var count = await _mediator.Send(command);
                return Ok(new { message = $"{count} medicines imported successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest($"Error parsing CSV: {ex.Message}");
            }
        }
    }
}
