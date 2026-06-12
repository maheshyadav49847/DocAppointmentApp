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
using Microsoft.Extensions.DependencyInjection;
namespace CodeX.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class MedicinesController : ControllerBase
    {
        private readonly IMediator _mediator;
        private readonly IServiceScopeFactory _serviceScopeFactory;

        public MedicinesController(IMediator mediator, IServiceScopeFactory serviceScopeFactory)
        {
            _mediator = mediator;
            _serviceScopeFactory = serviceScopeFactory;
        }

        private Guid GetOrganizationId()
        {
            var orgIdClaim = User.FindFirst("OrganizationId")?.Value ?? User.FindFirst("orgId")?.Value;
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
        public async Task<IActionResult> GetMedicines([FromQuery] string? search, [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 50, [FromQuery] string? sortColumn = null, [FromQuery] string? sortDirection = null)
        {
            var query = new GetMedicinesQuery
            {
                OrganizationId = GetOrganizationId(),
                SearchTerm = search,
                PageNumber = pageNumber,
                PageSize = pageSize,
                SortColumn = sortColumn,
                SortDirection = sortDirection
            };
            var result = await _mediator.Send(query);
            return Ok(result);
        }

        [HttpGet("types")]
        public async Task<IActionResult> GetMedicineTypes()
        {
            var query = new GetMedicineTypesQuery();
            var result = await _mediator.Send(query);
            return Ok(result);
        }

        [HttpPost("types")]
        public async Task<IActionResult> CreateMedicineType([FromBody] CreateMedicineTypeCommand command)
        {
            var id = await _mediator.Send(command);
            return Ok(new { id, command.Name });
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
        [DisableRequestSizeLimit]
        [RequestFormLimits(ValueLengthLimit = int.MaxValue, MultipartBodyLengthLimit = int.MaxValue)]
        public async Task<IActionResult> ImportMedicines(IFormFile file)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest("File is not selected or empty");
            }

            try
            {
                var tempPath = Path.GetTempFileName();
                using (var stream = new FileStream(tempPath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                var orgId = GetOrganizationId();
                var userId = GetUserId();

                _ = Task.Run(async () =>
                {
                    try
                    {
                        using var reader = new StreamReader(tempPath);
                        using var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture)
                        {
                            HeaderValidated = null,
                            MissingFieldFound = null,
                            IgnoreBlankLines = true
                        });

                        var records = csv.GetRecords<MedicineImportDto>().ToList();

                        var command = new ImportMedicinesCommand
                        {
                            OrganizationId = orgId,
                            UserId = userId,
                            Medicines = records
                        };

                        using var scope = _serviceScopeFactory.CreateScope();
                        var scopedMediator = scope.ServiceProvider.GetRequiredService<IMediator>();
                        await scopedMediator.Send(command);
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Background import failed: {ex.Message}");
                    }
                    finally
                    {
                        if (System.IO.File.Exists(tempPath)) System.IO.File.Delete(tempPath);
                    }
                });

                return Accepted(new { message = $"File uploaded successfully. Processing has started in the background. Please refresh after a few minutes." });
            }
            catch (Exception ex)
            {
                return BadRequest($"Error parsing CSV: {ex.Message}");
            }
        }
    }
}
