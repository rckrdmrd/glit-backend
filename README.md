# GLIT Platform Backend

Production-ready Node.js + TypeScript + Express backend with PostgreSQL native connection for the GLIT educational platform.

## Features

- **Authentication**: JWT-based authentication with bcrypt password hashing
- **Gamification**: ML Coins economy, achievements, user stats tracking
- **Row Level Security (RLS)**: PostgreSQL RLS integration for data isolation
- **TypeScript**: Full type safety and modern JavaScript features
- **Express**: Robust HTTP server with comprehensive middleware
- **PostgreSQL**: Native PostgreSQL connection with connection pooling
- **Production Ready**: Error handling, logging, validation, security headers

## Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript 5+
- **Framework**: Express 4.18+
- **Database**: PostgreSQL (native 'pg' client)
- **Authentication**: JWT + bcrypt
- **Validation**: Joi
- **Logging**: Winston

## Project Structure

```
backend/
├── src/
│   ├── config/           # Configuration files (env, database, jwt)
│   ├── middleware/       # Express middleware (auth, RLS, error handling)
│   ├── modules/          # Feature modules
│   │   ├── auth/         # Authentication module
│   │   ├── gamification/ # Gamification module
│   │   └── health/       # Health check routes
│   ├── shared/           # Shared utilities and types
│   ├── database/         # Database connection pool
│   ├── app.ts            # Express app configuration
│   └── server.ts         # Server entry point
├── dist/                 # Compiled JavaScript (generated)
├── logs/                 # Application logs
├── tests/                # Test files
├── .env                  # Environment variables
├── .env.example          # Environment variables template
├── package.json          # Dependencies and scripts
└── tsconfig.json         # TypeScript configuration
```

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL >= 15.0
- GLIT database schema installed (see database track)

## Installation

1. **Clone the repository** (if not already done)

2. **Navigate to backend directory**:
   ```bash
   cd /home/isem/workspace/projects/glit/backend
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```

5. **Edit `.env` file** with your database credentials:
   ```env
   PORT=3001
   NODE_ENV=development
   
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=glit_platform
   DB_USER=glit_user
   DB_PASSWORD=your_password
   
   JWT_SECRET=your_super_secret_jwt_key_change_in_production
   JWT_EXPIRES_IN=7d
   JWT_REFRESH_EXPIRES_IN=30d
   
   CORS_ORIGIN=http://localhost:3000
   ```

## Development

### Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3001` with hot-reloading enabled.

### Build for Production

```bash
npm run build
```

Compiled JavaScript will be output to the `dist/` directory.

### Start Production Server

```bash
npm start
```

### Other Scripts

- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## API Endpoints

### Health Check

- **GET** `/api/health` - Basic health check
- **GET** `/api/health/db` - Database connection status
- **GET** `/api/health/detailed` - Detailed system health

### Authentication (`/api/auth`)

- **POST** `/api/auth/register` - Register new user
- **POST** `/api/auth/login` - Login user
- **POST** `/api/auth/refresh` - Refresh access token
- **GET** `/api/auth/me` - Get current user (protected)
- **PUT** `/api/auth/password` - Update password (protected)
- **POST** `/api/auth/logout` - Logout user (protected)

### Gamification (`/api/gamification`)

- **GET** `/api/gamification/stats/:userId` - Get user stats (protected)
- **POST** `/api/gamification/coins/add` - Add ML Coins (protected)
- **GET** `/api/gamification/transactions/:userId` - Get ML Coins transactions (protected)
- **GET** `/api/gamification/achievements` - Get all achievements
- **GET** `/api/gamification/achievements/:userId` - Get user achievements (protected)
- **POST** `/api/gamification/achievements/unlock` - Unlock achievement (protected)

## Architecture Patterns

### Repository Pattern
Handles all database operations, isolating data access logic.

```typescript
// Example: auth.repository.ts
async findUserByEmail(email: string): Promise<User | null>
async createUser(userData: CreateUserData): Promise<User>
```

### Service Pattern
Contains business logic and coordinates between repositories.

```typescript
// Example: auth.service.ts
async register(registerDto: RegisterDto): Promise<AuthResponse>
async login(loginDto: LoginDto): Promise<AuthResponse>
```

### Controller Pattern
Handles HTTP requests/responses and calls service methods.

```typescript
// Example: auth.controller.ts
register = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void>
login = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void>
```

## Row Level Security (RLS)

The backend implements PostgreSQL RLS by setting session variables:

```typescript
// RLS middleware sets these PostgreSQL variables
SET LOCAL request.jwt.claim.sub = 'user_id';
SET LOCAL request.jwt.claim.role = 'user_role';
SET LOCAL request.jwt.claim.email = 'user_email';
```

RLS policies in the database use these variables to enforce access control.

## Authentication Flow

1. **Register**: POST `/api/auth/register` → Returns JWT token
2. **Login**: POST `/api/auth/login` → Returns JWT token
3. **Protected Routes**: Include `Authorization: Bearer <token>` header
4. **Token Refresh**: POST `/api/auth/refresh` with refresh token

## Error Handling

All errors return a consistent format:

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

Common error codes:
- `UNAUTHORIZED` - Missing or invalid token
- `FORBIDDEN` - Insufficient permissions
- `VALIDATION_ERROR` - Invalid input data
- `NOT_FOUND` - Resource not found
- `EMAIL_EXISTS` - Email already registered

## Testing

### Health Check

```bash
curl http://localhost:3001/api/health
```

### Register User

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234",
    "firstName": "Test",
    "lastName": "User"
  }'
```

### Login

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234"
  }'
```

### Get User Profile (with token)

```bash
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Database Connection

The backend uses PostgreSQL native client (`pg`) with connection pooling:

- **Min connections**: 2
- **Max connections**: 10
- **Idle timeout**: 30 seconds
- **Connection timeout**: 10 seconds

## Security Features

- **Helmet**: Security headers
- **CORS**: Configurable cross-origin resource sharing
- **JWT**: Stateless authentication
- **bcrypt**: Password hashing (10 rounds)
- **Input validation**: Joi schema validation
- **Error sanitization**: No stack traces in production
- **RLS**: Database-level access control

## Logging

Winston logger outputs to:
- **Console**: All logs (development)
- **logs/combined.log**: All logs
- **logs/error.log**: Error logs only

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3001 |
| `NODE_ENV` | Environment | development |
| `DB_HOST` | PostgreSQL host | localhost |
| `DB_PORT` | PostgreSQL port | 5432 |
| `DB_NAME` | Database name | glit_platform |
| `DB_USER` | Database user | glit_user |
| `DB_PASSWORD` | Database password | (required) |
| `JWT_SECRET` | JWT secret key | (required) |
| `JWT_EXPIRES_IN` | Access token expiry | 7d |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry | 30d |
| `CORS_ORIGIN` | Allowed CORS origin | http://localhost:3000 |

## Troubleshooting

### Database Connection Failed

```
✗ Database connection failed
```

**Solution**: Check database credentials in `.env` and ensure PostgreSQL is running.

### Port Already in Use

```
Error: listen EADDRINUSE: address already in use :::3001
```

**Solution**: Change PORT in `.env` or kill the process using port 3001.

### Token Invalid or Expired

```
{ "error": { "code": "INVALID_TOKEN" } }
```

**Solution**: Obtain a new token by logging in again.

## Next Steps

1. Start the backend server: `npm run dev`
2. Test health endpoints
3. Test authentication flow
4. Integrate with frontend
5. Add more gamification features
6. Implement admin endpoints

## Contributing

Follow the established patterns:
1. **Repository** for database access
2. **Service** for business logic
3. **Controller** for HTTP handling
4. Add proper TypeScript types
5. Include JSDoc comments
6. Handle errors appropriately

## License

MIT

## Documentation

For complete API documentation, see:
- `/home/isem/workspace/docs/projects/glit/01-architecture/backend-api-reference.md`
- `/home/isem/workspace/docs/projects/glit/01-architecture/nodejs-backend-architecture.md`

---

**GLIT Platform Backend** - Track 2 Implementation
**Version**: 1.0.0
**Date**: October 2025
