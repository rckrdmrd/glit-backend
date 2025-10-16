# Notifications Module

Sistema completo de notificaciones en tiempo real para GLIT Platform.

## Quick Start

### Backend Usage (Enviar notificaciones desde otros módulos)

```typescript
import { notifyAchievementUnlocked } from './notifications/notifications.helper';

// Enviar notificación de logro
await notifyAchievementUnlocked(
  userId,
  achievementId,
  'First Steps',
  'trophy.png',
  100 // ML Coins
);
```

### Frontend Connection (React)

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001', {
  auth: { token: jwtToken }
});

socket.on('notification:new', (data) => {
  console.log('New notification:', data.notification);
});
```

## API Endpoints

- `GET /api/notifications` - Lista de notificaciones (paginado)
- `GET /api/notifications/unread-count` - Contador no leídas
- `PATCH /api/notifications/:id/read` - Marcar como leída
- `DELETE /api/notifications/:id` - Eliminar
- `POST /api/notifications/read-all` - Marcar todas como leídas
- `POST /api/notifications/send` - Enviar (admin only)

## Files

- `notifications.types.ts` - TypeScript interfaces
- `notifications.repository.ts` - Database queries
- `notifications.service.ts` - Business logic
- `notifications.controller.ts` - HTTP handlers
- `notifications.routes.ts` - API routes
- `notifications.validation.ts` - Joi schemas
- `notifications.helper.ts` - Helper functions
- `example.usage.ts` - Usage examples

## Documentation

Documentación completa: `/backend/NOTIFICATIONS_INTEGRATION.md`

## Architecture

```
REST API ──┐
           ├──> Service ──> Repository ──> PostgreSQL
WebSocket ─┘

Helper Functions ──> Service + WebSocket Emit
```
