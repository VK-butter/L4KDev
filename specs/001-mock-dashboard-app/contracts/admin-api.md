# Admin API Contract

Base URL: `/api/admin`

## Authentication
- Requires valid session cookie with `role = admin`
- All responses JSON: `{ data, error }`

## Endpoints

### GET `/users`
- **Purpose**: List all user accounts for admin grid.
- **Query Params**: `status` (optional enum), `search` (optional string)
- **Response**:
```json
{
  "data": [
    {
      "id": "uuid",
      "username": "analyst01",
      "displayName": "Analyst 01",
      "role": "analyst",
      "status": "active",
      "lastLoginAt": "2025-11-09T12:00:00Z"
    }
  ]
}
```

### POST `/users`
- **Purpose**: Create a new account from the Admin menu modal.
- **Body**:
```json
{
  "username": "string",
  "displayName": "string",
  "role": "analyst|admin",
  "password": "string (min 8 chars)"
}
```
- **Response**: `201` with created user object.

### PATCH `/users/:id`
- **Purpose**: Update display name or role.
- **Body**:
```json
{
  "displayName": "optional string",
  "role": "optional enum"
}
```
- **Response**: `200` with updated user.

### POST `/users/:id/deactivate`
- **Purpose**: Toggle status to inactive.
- **Response**: `200` with `{ status: "inactive" }`.

### POST `/users/:id/reactivate`
- **Purpose**: Restore status to active.

### GET `/audit`
- **Purpose**: Retrieve admin action log (optional stretch).
