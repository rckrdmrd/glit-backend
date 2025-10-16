# Admin Module

Complete backend admin API module for system management, user administration, and content moderation.

## Overview

This module provides comprehensive admin functionality with strict authorization checks, full audit logging, and rate limiting. Only users with `super_admin` role can access these endpoints.

## Architecture

```
admin/
├── admin.types.ts           # TypeScript interfaces and types
├── admin.middleware.ts      # Authorization, rate limiting, audit logging
├── admin.routes.ts          # Main router combining all sub-routes
├── admin.service.ts         # Admin business logic and dashboard
├── admin.repository.ts      # Admin database operations
├── admin.validation.ts      # Common validation schemas
├── users.controller.ts      # User management HTTP handlers
├── users.service.ts         # User business logic
├── users.repository.ts      # User database operations
├── users.routes.ts          # User route definitions
├── users.validation.ts      # User validation schemas
├── organizations.*          # Organization management (6 endpoints)
├── content.*                # Content moderation (4 endpoints)
├── system.*                 # System monitoring (2 endpoints)
├── audit.service.ts         # Audit logging service
└── health.service.ts        # System health monitoring
```

## Endpoints (20 Total)

### User Management (8 endpoints)

```
GET    /api/admin/users                    # List all users (paginated)
GET    /api/admin/users/:id                # Get user details
PATCH  /api/admin/users/:id                # Update user
DELETE /api/admin/users/:id                # Delete/ban user
POST   /api/admin/users/:id/suspend        # Suspend user
POST   /api/admin/users/:id/unsuspend      # Unsuspend user
POST   /api/admin/users/:id/reset-password # Force password reset
GET    /api/admin/users/:id/activity       # User activity log
```

### Organization Management (6 endpoints)

```
GET    /api/admin/organizations            # List organizations
POST   /api/admin/organizations            # Create organization
GET    /api/admin/organizations/:id        # Get organization details
PUT    /api/admin/organizations/:id        # Update organization
DELETE /api/admin/organizations/:id        # Delete organization
GET    /api/admin/organizations/:id/stats  # Organization statistics
```

### Content Moderation (4 endpoints)

```
GET    /api/admin/content/flagged          # Get flagged content
POST   /api/admin/content/:id/approve      # Approve content
POST   /api/admin/content/:id/reject       # Reject content
DELETE /api/admin/content/:id              # Delete content
```

### System Management (2 endpoints)

```
GET    /api/admin/system/metrics           # System health metrics
GET    /api/admin/system/logs              # System logs
```

## Features

### Security

- **Strict Authorization**: Only `super_admin` role can access
- **Audit Logging**: Every admin action is logged with before/after state
- **Rate Limiting**: 5 requests per minute per admin
- **Self-Protection**: Admins cannot delete or demote themselves
- **Permission Validation**: Additional checks for sensitive operations

### User Management

- Paginated user listing with advanced filtering
- Full user lifecycle management (create, read, update, delete)
- Suspension system (temporary or permanent)
- Force password reset capability
- User activity log tracking
- GDPR-compliant data export

### Organization Management

- Create and manage organizations/tenants
- Track organization statistics and metrics
- User count and activity monitoring
- Subscription tier management

### Content Moderation

- Flag and review user-generated content
- Priority-based moderation queue
- Approve/reject/remove actions
- Moderator assignment
- Review notes and history

### System Monitoring

- Real-time system metrics (CPU, memory, API performance)
- Database query performance monitoring
- Active user tracking
- Error rate monitoring
- System health status
- Application logs with filtering

### Audit Trail

- Immutable audit log for all admin actions
- Includes before/after state for updates
- IP address and user agent tracking
- Searchable and filterable
- Automatic activity logging for user events

## Middleware

### requireSuperAdmin

Verifies that the authenticated user has `super_admin` role. Logs unauthorized access attempts.

### adminRateLimit

Implements rate limiting (5 requests/minute) for admin operations.

### auditAdminAction

Logs all admin actions to the audit trail with full context.

## Database Schema

### Tables

- `auth_management.user_suspensions` - User suspensions and bans
- `audit_logging.user_activity` - User activity log
- `content_management.flagged_content` - Content moderation queue
- `audit_logging.system_logs` - System application logs

### Views

- `admin_dashboard.user_stats_summary` - User statistics
- `admin_dashboard.organization_stats_summary` - Organization statistics
- `admin_dashboard.moderation_queue` - Pending moderation items
- `admin_dashboard.recent_admin_actions` - Recent admin actions

## Usage Examples

### List Users with Filtering

```bash
curl -X GET "http://localhost:3001/api/admin/users?page=1&limit=50&role=student&status=active&search=john" \
  -H "Authorization: Bearer <admin-token>"
```

### Suspend User

```bash
curl -X POST "http://localhost:3001/api/admin/users/:id/suspend" \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Violation of terms of service",
    "duration_days": 30
  }'
```

### Get System Metrics

```bash
curl -X GET "http://localhost:3001/api/admin/system/metrics" \
  -H "Authorization: Bearer <admin-token>"
```

## Business Logic Highlights

### User Service

- Validates email uniqueness on updates
- Prevents admin self-deletion and self-demotion
- Logs all actions with before/after state
- Sends notifications on critical changes
- Supports GDPR data export

### Admin Service

- Dashboard statistics aggregation
- User analytics (growth, active users, role distribution)
- Organization rankings and metrics
- System-wide statistics
- Admin action audit log retrieval

### Content Service

- Priority-based moderation queue
- Auto-flagging based on rules
- Moderator assignment
- Appeal system support
- Content removal with reason tracking

## Rate Limiting

Admin endpoints have rate limiting:
- 5 requests per minute per admin user
- Higher limits than regular users
- Tracked per admin ID
- Resets every minute

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

## Validation

All input is validated using Joi schemas:
- Query parameters (pagination, filtering)
- Path parameters (UUIDs)
- Request bodies (user data, suspension data, etc.)

## Testing Recommendations

### Unit Tests

- Test all repository methods with mock database
- Test service business logic
- Test validation schemas
- Test middleware (authorization, rate limiting, audit logging)

### Integration Tests

- Test all 20 endpoints end-to-end
- Test authorization (non-admin access should fail)
- Test rate limiting behavior
- Test audit log creation
- Test self-protection (admin cannot delete self)

### Security Tests

- Attempt unauthorized access to admin endpoints
- Attempt privilege escalation
- Test rate limiting circumvention
- Test SQL injection in filters
- Test XSS in content fields

## Maintenance

### Log Cleanup

Run these functions periodically:

```sql
-- Clean old user activity logs (keep 90 days)
SELECT cleanup_old_user_activity(90);

-- Clean old system logs (keep 30 days for debug/info)
SELECT cleanup_old_system_logs(30);
```

### Monitoring

Monitor these metrics:
- Admin action frequency
- Failed authorization attempts
- Rate limit hits
- Error rates in admin operations
- Audit log growth

## Security Considerations

1. **Never Hard Delete**: Always use soft deletes for users
2. **Audit Everything**: All admin actions are logged
3. **Rate Limiting**: Prevents abuse and accidental DoS
4. **Self-Protection**: Admins cannot harm themselves
5. **Permission Checks**: Additional validation for sensitive operations
6. **IP Logging**: Track where admin actions originate
7. **GDPR Compliance**: Support for user data export and deletion

## Performance Considerations

1. **Indexed Queries**: All filter fields are indexed
2. **Pagination**: Required for large result sets
3. **Connection Pooling**: Efficient database connections
4. **Caching**: Consider caching dashboard statistics
5. **Log Rotation**: Automatic cleanup of old logs

## Future Enhancements

- Two-factor authentication for admin actions
- Email notifications for critical admin actions
- Scheduled reports and exports
- Bulk user operations
- Advanced analytics and visualizations
- Content auto-moderation with AI
- Real-time websocket updates for admin dashboard
- Role-based admin permissions (super admin vs regular admin)

## File Statistics

- **Total Lines**: 7,649 lines of TypeScript
- **Migration SQL**: 349 lines
- **Total Endpoints**: 20 endpoints
- **Controllers**: 4 controllers
- **Services**: 6 services
- **Repositories**: 5 repositories
- **Middleware**: 3 middleware functions
- **Validation Schemas**: 15+ schemas
