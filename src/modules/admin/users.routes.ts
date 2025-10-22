/**
 * Users Routes
 *
 * Route definitions for user management in admin module.
 */

import { Router } from 'express';
import { UsersController } from './users.controller';

const router = Router();
const usersController = new UsersController();

// Note: Authentication, authorization, rate limiting, and audit logging
// are applied at the parent router level in admin.routes.ts

/**
 * User Management Endpoints
 */

// GET /api/admin/users - List all users (paginated)
router.get('/', usersController.getAllUsers);

// GET /api/admin/users/:id - Get user details
router.get('/:id', usersController.getUserById);

// PATCH /api/admin/users/:id - Update user
router.patch('/:id', usersController.updateUser);

// DELETE /api/admin/users/:id - Delete/ban user
router.delete('/:id', usersController.deleteUser);

// POST /api/admin/users/:id/suspend - Suspend user
router.post('/:id/suspend', usersController.suspendUser);

// POST /api/admin/users/:id/unsuspend - Unsuspend user
router.post('/:id/unsuspend', usersController.unsuspendUser);

// POST /api/admin/users/:id/activate - Activate user
router.post('/:id/activate', usersController.activateUser);

// POST /api/admin/users/:id/deactivate - Deactivate user
router.post('/:id/deactivate', usersController.deactivateUser);

// POST /api/admin/users/:id/reset-password - Force password reset
router.post('/:id/reset-password', usersController.forcePasswordReset);

// GET /api/admin/users/:id/activity - User activity log
router.get('/:id/activity', usersController.getUserActivity);

export default router;
