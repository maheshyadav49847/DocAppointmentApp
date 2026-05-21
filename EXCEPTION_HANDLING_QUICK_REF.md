# Exception Handling - Quick Reference Guide

## TL;DR - Use These Instead of `throw new Exception()`

### 404 - Entity Not Found
```csharp
throw new EntityNotFoundException(nameof(Doctor), doctorId);
```

### 401 - Authentication Failed
```csharp
throw new UnauthorizedAccessException("Invalid email or password.", "INVALID_CREDENTIALS");
```

### 403 - Access Denied
```csharp
throw new ForbiddenAccessException("Queue", "You can only access your organization's queues.");
```

### 400 - Business Rule Violated
```csharp
throw new BusinessRuleViolationException(
    "Patient already has an active token",
    "DUPLICATE_ACTIVE_TOKEN",
    new { PatientId = patient.Id }
);
```

### 409 - Resource Conflict
```csharp
throw new ConflictException(
    "Queue is full",
    "QUEUE_FULL",
    new { Capacity = queue.Capacity, Current = queue.CurrentCount }
);
```

### 400 - Invalid Operation
```csharp
throw new InvalidOperationException(
    "Failed to allocate token after 3 retries",
    "TOKEN_ALLOCATION_FAILED"
);
```

### 502 - External Service Failed
```csharp
throw new ExternalServiceException("Twilio WhatsApp", "Connection timeout");
```

---

## Error Code Naming Convention

**Format:** `RESOURCE_ACTION_ERROR` or `RESOURCE_STATE`

### Examples:
✅ `DUPLICATE_ACTIVE_TOKEN`  
✅ `SESSION_DOCTOR_MISMATCH`  
✅ `QUEUE_FULL`  
✅ `BRANCH_OFFLINE`  
✅ `TOKEN_ALLOCATION_FAILED`  
✅ `INVALID_CREDENTIALS`  

❌ `ERR_001` (Too vague)  
❌ `ERROR` (Too generic)  
❌ `FAIL` (Meaningless)  

---

## Common Scenarios

| Scenario | Exception | Error Code |
|----------|-----------|-----------|
| DELETE resource that doesn't exist | `EntityNotFoundException` | `ENTITY_NOT_FOUND` |
| User provides wrong password | `UnauthorizedAccessException` | `INVALID_CREDENTIALS` |
| User tries to access another org's queue | `ForbiddenAccessException` | `FORBIDDEN_ACCESS` |
| Patient already booked in session | `ConflictException` | `DUPLICATE_ACTIVE_TOKEN` |
| Queue has reached capacity | `ConflictException` | `QUEUE_FULL` |
| Doctor doesn't match session | `BusinessRuleViolationException` | `SESSION_DOCTOR_MISMATCH` |
| Twilio API fails | `ExternalServiceException` | `EXTERNAL_SERVICE_ERROR` |
| Token number allocation fails | `InvalidOperationException` | `TOKEN_ALLOCATION_FAILED` |

---

## Example: Migration

### BEFORE ❌
```csharp
public async Task<Guid> Handle(CreateQueueCommand request, CancellationToken cancellationToken)
{
    var session = await _context.Sessions.FindAsync(request.SessionId);
    if (session == null)
        throw new Exception("Session not found");
    
    if (session.DoctorId != request.DoctorId)
        throw new Exception("Doctor mismatch");
    
    if (!await HasAccess(session.BranchId))
        throw new Exception("No access");
    
    // ... rest of logic
}
```

### AFTER ✅
```csharp
public async Task<Guid> Handle(CreateQueueCommand request, CancellationToken cancellationToken)
{
    var session = await _context.Sessions.FindAsync(request.SessionId);
    if (session == null)
        throw new EntityNotFoundException(nameof(Session), request.SessionId);
    
    if (session.DoctorId != request.DoctorId)
        throw new BusinessRuleViolationException(
            "The selected session does not belong to this doctor.",
            "SESSION_DOCTOR_MISMATCH",
            new { SessionId = request.SessionId, DoctorId = request.DoctorId }
        );
    
    if (!await HasAccess(session.BranchId))
        throw new ForbiddenAccessException(
            "Queue",
            "You can only create queues for your own organization."
        );
    
    // ... rest of logic
}
```

---

## Response Examples

### 404 Response
```json
{
  "message": "Patient not found (ID: 123e4567-e89b-12d3-a456-426614174000).",
  "errorCode": "ENTITY_NOT_FOUND",
  "statusCode": 404,
  "data": {
    "entityName": "Patient",
    "id": "123e4567-e89b-12d3-a456-426614174000"
  },
  "traceId": "00-0af7651916cd43dd8448eb211c80319c-b9c7c3f498cd4953-01",
  "timestamp": "2026-05-21T10:30:45.123Z"
}
```

### 409 Response
```json
{
  "message": "Queue is full. Maximum capacity of 50 reached.",
  "errorCode": "QUEUE_FULL",
  "statusCode": 409,
  "data": {
    "capacity": 50,
    "current": 50
  },
  "traceId": "00-0af7651916cd43dd8448eb211c80319c-b9c7c3f498cd4953-01",
  "timestamp": "2026-05-21T10:30:45.123Z"
}
```

### 400 Validation Response
```json
{
  "message": "One or more validation failures have occurred.",
  "errorCode": "VALIDATION_ERROR",
  "statusCode": 400,
  "validationErrors": {
    "PatientPhone": [
      "Invalid phone number format. Use 10-15 digits."
    ],
    "PatientName": [
      "'Patient Name' must not be empty."
    ]
  },
  "traceId": "00-0af7651916cd43dd8448eb211c80319c-b9c7c3f498cd4953-01",
  "timestamp": "2026-05-21T10:30:45.123Z"
}
```

---

## Testing Exception Handling

### Unit Test Example
```csharp
[Fact]
public async Task Handle_EntityNotFound_ThrowsException()
{
    var command = new GetPatientQuery { PatientId = Guid.Empty };
    var handler = new GetPatientQueryHandler(_context);
    
    var ex = await Assert.ThrowsAsync<EntityNotFoundException>(
        () => handler.Handle(command, CancellationToken.None)
    );
    
    Assert.Equal("ENTITY_NOT_FOUND", ex.ErrorCode);
    Assert.Contains("Patient", ex.Message);
}

[Fact]
public async Task Handle_ForbiddenAccess_ThrowsException()
{
    var command = new CreateQueueCommand { /* ... */ };
    var handler = new CreateQueueCommandHandler(_context, _currentUserService);
    
    var ex = await Assert.ThrowsAsync<ForbiddenAccessException>(
        () => handler.Handle(command, CancellationToken.None)
    );
    
    Assert.Equal("FORBIDDEN_ACCESS", ex.ErrorCode);
}
```

### Integration Test Example
```csharp
[Fact]
public async Task CreateQueue_WrongOrganization_Returns403()
{
    // Arrange: Create user from different org
    var response = await _client.PostAsync(
        "/api/queue/initialize",
        new StringContent(JsonSerializer.Serialize(command), Encoding.UTF8, "application/json")
    );
    
    // Assert
    Assert.Equal(403, (int)response.StatusCode);
    var content = await response.Content.ReadAsAsync<ErrorResponse>();
    Assert.Equal("FORBIDDEN_ACCESS", content.ErrorCode);
}
```

---

## Finding Exceptions to Fix

To find all old-style exceptions:
```bash
rg 'throw new Exception\(' --glob='**/*.cs' CodeX.Application CodeX.Api
```

Then replace with appropriate custom exception.

---

## Common Mistakes

❌ **Missing error code**
```csharp
throw new BusinessRuleViolationException("Error occurred");
```

✅ **Always include error code**
```csharp
throw new BusinessRuleViolationException("Error occurred", "SPECIFIC_ERROR_CODE");
```

---

❌ **No context data**
```csharp
throw new ConflictException("Duplicate token");
```

✅ **Include relevant IDs**
```csharp
throw new ConflictException(
    "Patient has duplicate token",
    "DUPLICATE_TOKEN",
    new { PatientId = patient.Id, QueueId = queue.Id }
);
```

---

❌ **Wrong exception type**
```csharp
if (queue == null)
    throw new ForbiddenAccessException("Queue", "Queue not found");
```

✅ **Use EntityNotFoundException for not found**
```csharp
if (queue == null)
    throw new EntityNotFoundException(nameof(DailyQueue), queueId);
```

---

## Questions?

Refer to `EXCEPTION_HANDLING.md` for detailed documentation.
