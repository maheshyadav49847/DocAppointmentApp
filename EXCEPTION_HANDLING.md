# Exception Handling System Documentation

## Overview

The application implements a **hierarchical exception handling system** with custom exception types, global middleware, and standardized error responses. This eliminates generic `Exception` throws and provides structured error information.

---

## Exception Hierarchy

```
ApplicationException (Base)
├── EntityNotFoundException
├── UnauthorizedAccessException (401)
├── ForbiddenAccessException (403)
├── BusinessRuleViolationException (400)
├── InvalidOperationException (400)
├── ConflictException (409)
├── ExternalServiceException (502)
└── ValidationException (400) [existing]
```

---

## Exception Types & Usage

### 1. **EntityNotFoundException**
**When:** Entity not found in database
**Status Code:** 404
**Usage:**
```csharp
var session = await _context.Sessions.FirstOrDefaultAsync(s => s.Id == id);
if (session == null)
    throw new EntityNotFoundException(nameof(Session), id);
```
**Response:**
```json
{
  "message": "Session not found (ID: 123e4567-e89b-12d3-a456-426614174000).",
  "errorCode": "ENTITY_NOT_FOUND",
  "statusCode": 404,
  "data": {
    "entityName": "Session",
    "id": "123e4567-e89b-12d3-a456-426614174000"
  }
}
```

### 2. **UnauthorizedAccessException**
**When:** Authentication failed (invalid credentials, expired token)
**Status Code:** 401
**Usage:**
```csharp
if (staff == null || !BCrypt.Net.BCrypt.Verify(password, staff.PasswordHash))
    throw new UnauthorizedAccessException(
        "Invalid email or password.",
        "INVALID_CREDENTIALS"
    );
```
**Response:**
```json
{
  "message": "Invalid email or password.",
  "errorCode": "INVALID_CREDENTIALS",
  "statusCode": 401
}
```

### 3. **ForbiddenAccessException**
**When:** User lacks permission (IDOR, wrong organization/branch)
**Status Code:** 403
**Usage:**
```csharp
if (session.Branch.OrganizationId != currentUser.OrgId)
    throw new ForbiddenAccessException(
        "Queue",
        "You can only create queues for your own organization."
    );
```
**Response:**
```json
{
  "message": "Access to Queue is forbidden. You can only create queues for your own organization.",
  "errorCode": "FORBIDDEN_ACCESS",
  "statusCode": 403,
  "data": {
    "resourceType": "Queue",
    "reason": "You can only create queues for your own organization."
  }
}
```

### 4. **BusinessRuleViolationException**
**When:** Business logic constraint violated
**Status Code:** 400
**Usage:**
```csharp
if (hasActiveToken)
    throw new BusinessRuleViolationException(
        "This patient already has an active token in this session.",
        "DUPLICATE_ACTIVE_TOKEN",
        new { PatientId = patient.Id, QueueId = queue.Id }
    );
```
**Response:**
```json
{
  "message": "This patient already has an active token in this session.",
  "errorCode": "DUPLICATE_ACTIVE_TOKEN",
  "statusCode": 400,
  "data": {
    "patientId": "123e4567-e89b-12d3-a456-426614174000",
    "queueId": "223e4567-e89b-12d3-a456-426614174000"
  }
}
```

### 5. **ConflictException**
**When:** Resource conflict (duplicate, capacity exceeded, stale data)
**Status Code:** 409
**Usage:**
```csharp
if (tokenCount >= queue.Session.DefaultCapacity)
    throw new ConflictException(
        $"Queue is full. Maximum capacity of {queue.Session.DefaultCapacity} reached.",
        "QUEUE_FULL",
        new { Capacity = queue.Session.DefaultCapacity, Current = tokenCount }
    );
```
**Response:**
```json
{
  "message": "Queue is full. Maximum capacity of 50 reached.",
  "errorCode": "QUEUE_FULL",
  "statusCode": 409,
  "data": {
    "capacity": 50,
    "current": 50
  }
}
```

### 6. **InvalidOperationException**
**When:** Operation cannot be performed (retries exhausted, state mismatch)
**Status Code:** 400
**Usage:**
```csharp
if (!saved || token == null)
    throw new InvalidOperationException(
        "Failed to allocate a unique token number. Please retry.",
        "TOKEN_ALLOCATION_FAILED"
    );
```
**Response:**
```json
{
  "message": "Failed to allocate a unique token number. Please retry.",
  "errorCode": "TOKEN_ALLOCATION_FAILED",
  "statusCode": 400
}
```

### 7. **ExternalServiceException**
**When:** External API/service call fails (Twilio, SMS, etc.)
**Status Code:** 502
**Usage:**
```csharp
try
{
    await _whatsappService.SendMessage(...);
}
catch (Exception ex)
{
    throw new ExternalServiceException("Twilio WhatsApp", ex.Message, ex);
}
```
**Response:**
```json
{
  "message": "External service 'Twilio WhatsApp' failed: Connection timeout",
  "errorCode": "EXTERNAL_SERVICE_ERROR",
  "statusCode": 502,
  "data": {
    "serviceName": "Twilio WhatsApp"
  }
}
```

### 8. **ValidationException** (existing, enhanced)
**When:** Fluent validation fails
**Status Code:** 400
**Usage:** Automatic via ValidationBehavior
**Response:**
```json
{
  "message": "One or more validation failures have occurred.",
  "errorCode": "VALIDATION_ERROR",
  "statusCode": 400,
  "validationErrors": {
    "PatientPhone": ["Invalid phone number format. Use 10-15 digits."],
    "PatientName": ["'Patient Name' must not be empty."]
  }
}
```

---

## Global Exception Middleware

**Location:** `CodeX.Api/Middleware/GlobalExceptionMiddleware.cs`

**Flow:**
1. Every request passes through the middleware
2. Exceptions caught and mapped to appropriate HTTP status codes
3. Structured JSON response returned
4. Request trace ID included for tracking
5. Errors logged at appropriate level (Warning, Error)

**Registration (Program.cs):**
```csharp
// Must be early in pipeline for all exceptions to be caught
app.UseMiddleware<GlobalExceptionMiddleware>();
app.UseCors("DefaultPolicy");
// ... other middleware
```

---

## Standard Error Response Format

All errors follow this structure:
```json
{
  "message": "Human-readable description",
  "errorCode": "MACHINE_READABLE_CODE",
  "statusCode": 400,
  "traceId": "00-0af7651916cd43dd8448eb211c80319c-b9c7c3f498cd4953-01",
  "data": null,              // Optional: additional context
  "validationErrors": null,  // Optional: validation errors only
  "timestamp": "2026-05-21T10:30:45.123Z"
}
```

---

## Migration Guide

### Before (Generic Exceptions):
```csharp
if (patient == null)
    throw new Exception("Patient not found");

if (!hasPermission)
    throw new Exception("Unauthorized");

if (queue.IsFull)
    throw new Exception("Queue is full");
```

### After (Custom Exceptions):
```csharp
if (patient == null)
    throw new EntityNotFoundException(nameof(Patient), patientId);

if (!hasPermission)
    throw new ForbiddenAccessException("Patient", "You don't own this patient");

if (queue.IsFull)
    throw new ConflictException(
        "Queue is full",
        "QUEUE_FULL",
        new { Capacity = queue.Capacity }
    );
```

---

## Best Practices

### 1. **Choose the Right Exception Type**
```csharp
// ✅ GOOD: Specific exception
if (doctor == null)
    throw new EntityNotFoundException(nameof(Doctor), doctorId);

// ❌ WRONG: Too generic
if (doctor == null)
    throw new Exception("Doctor not found");
```

### 2. **Include Context in Data**
```csharp
// ✅ GOOD: Include relevant IDs for debugging
throw new ConflictException(
    "Patient has active token",
    "DUPLICATE_TOKEN",
    new { PatientId = patient.Id, QueueId = queue.Id }
);

// ❌ WRONG: No context
throw new ConflictException("Conflict", "CONFLICT");
```

### 3. **Use Meaningful Error Codes**
```csharp
// ✅ GOOD: Descriptive, searchable codes
throw new BusinessRuleViolationException(
    "Session doesn't belong to this doctor",
    "SESSION_DOCTOR_MISMATCH"
);

// ❌ WRONG: Vague codes
throw new BusinessRuleViolationException("Error", "ERR_001");
```

### 4. **Log External Service Failures**
```csharp
try
{
    await _whatsappService.Send(...);
}
catch (Exception ex)
{
    _logger.LogError(ex, "WhatsApp send failed for phone: {Phone}", phone);
    throw new ExternalServiceException("Twilio", ex.Message, ex);
}
```

---

## Error Codes Reference

| Code | Status | Meaning |
|------|--------|---------|
| `ENTITY_NOT_FOUND` | 404 | Resource doesn't exist |
| `INVALID_CREDENTIALS` | 401 | Login failed |
| `UNAUTHORIZED_ACCESS` | 401 | Auth token missing/invalid |
| `FORBIDDEN_ACCESS` | 403 | Insufficient permissions |
| `DUPLICATE_ACTIVE_TOKEN` | 409 | Patient already booked |
| `QUEUE_FULL` | 409 | Session capacity exceeded |
| `BRANCH_OFFLINE` | 400 | Branch not accepting bookings |
| `SESSION_DOCTOR_MISMATCH` | 400 | Session wrong for doctor |
| `TOKEN_ALLOCATION_FAILED` | 400 | Concurrent token creation issue |
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `EXTERNAL_SERVICE_ERROR` | 502 | Third-party API failed |
| `INTERNAL_SERVER_ERROR` | 500 | Unhandled exception |

---

## Testing Exception Handling

### Example: Test 404 Response
```csharp
[Fact]
public async Task GetPatient_NonexistentId_Returns404()
{
    var result = await _controller.GetPatient(Guid.Empty);
    
    Assert.Equal(404, result.StatusCode);
    Assert.Equal("ENTITY_NOT_FOUND", result.ErrorCode);
}
```

### Example: Test Authorization
```csharp
[Fact]
public async Task CreateQueue_WrongOrg_Returns403()
{
    var queueCmd = new CreateDailyQueueCommand { ... };
    
    var ex = await Assert.ThrowsAsync<ForbiddenAccessException>(
        () => handler.Handle(queueCmd, CancellationToken.None)
    );
    
    Assert.Equal("FORBIDDEN_ACCESS", ex.ErrorCode);
}
```

---

## Files Created/Modified

### New Files:
- `CodeX.Application/Common/Exceptions/ApplicationException.cs` (base)
- `CodeX.Application/Common/Exceptions/EntityNotFoundException.cs`
- `CodeX.Application/Common/Exceptions/UnauthorizedAccessException.cs`
- `CodeX.Application/Common/Exceptions/ForbiddenAccessException.cs`
- `CodeX.Application/Common/Exceptions/BusinessRuleViolationException.cs`
- `CodeX.Application/Common/Exceptions/InvalidOperationException.cs`
- `CodeX.Application/Common/Exceptions/ConflictException.cs`
- `CodeX.Application/Common/Exceptions/ExternalServiceException.cs`
- `CodeX.Application/Common/Exceptions/ErrorResponse.cs`
- `CodeX.Api/Middleware/GlobalExceptionMiddleware.cs`

### Modified Files:
- `Program.cs` - Added middleware registration
- `LoginCommand.cs` - Updated exception handling
- `CreateDailyQueueCommand.cs` - Updated exception handling
- `CreateTokenCommand.cs` - Updated exception handling
- `CallNextTokenCommand.cs` - Updated exception handling
- `ResourceAuthorization.cs` - Updated exception handling

---

## Next Steps

To complete the migration, update remaining command/query handlers:
```bash
# Search for all throw new Exception(
rg 'throw new Exception\(' --glob='**/*.cs'

# Replace with appropriate custom exception
# Example: throw new EntityNotFoundException / BusinessRuleViolationException / etc.
```

---

## Support

For issues or questions about exception handling, refer to error codes in logs and match with the table above.
