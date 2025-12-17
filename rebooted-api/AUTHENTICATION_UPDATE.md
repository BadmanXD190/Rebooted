# Backend Authentication Update

## Changes Made

The backend API has been updated to use JWT token authentication instead of a hardcoded `TEST_USER_ID`.

### 1. **Added JWT Authentication Middleware**

A new middleware function `getUserIdFromToken` has been added that:
- Extracts the JWT token from the `Authorization: Bearer <token>` header
- Verifies the token with Supabase
- Extracts the user ID from the verified token
- Attaches the user ID to `req.userId` for use in route handlers

### 2. **Updated API Endpoints**

Both `/decompose` and `/schedule` endpoints now:
- Use the `getUserIdFromToken` middleware
- Extract `userId` from `req.userId` instead of `TEST_USER_ID`
- Pass the authenticated user's ID to helper functions

### 3. **Updated Helper Functions**

- `savePlanToSupabase(plan, rawText, userId)` - Now accepts `userId` as a parameter
- `saveScheduleToSupabase(schedulePlan, projectId, userId)` - Now accepts `userId` as a parameter
- Both functions validate that `userId` is provided

### 4. **Frontend Updates**

The frontend API client now:
- Automatically retrieves the current session token from Supabase
- Sends the token in the `Authorization: Bearer <token>` header with all requests
- No changes needed in individual API calls - authentication is handled automatically

## Migration Notes

### Removed
- `TEST_USER_ID` environment variable (no longer needed)
- All references to `TEST_USER_ID` in the codebase

### Required
- Frontend must be logged in (have a valid Supabase session)
- All API requests must include a valid JWT token in the Authorization header

## Testing

1. **Ensure user is logged in** in the mobile app
2. **Create a project** - The project should be saved with the authenticated user's ID
3. **Generate a schedule** - The schedule should be associated with the authenticated user
4. **Verify in Supabase** - Check that `user_id` in projects/tasks/schedules matches the logged-in user's ID

## Error Handling

If authentication fails:
- **401 Unauthorized** - Missing or invalid Authorization header
- **401 Unauthorized** - Invalid or expired token
- **401 Unauthorized** - Token verification failed

The frontend will receive these errors and can handle them appropriately (e.g., redirect to login).




