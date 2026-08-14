/**
 * Auth middleware — Supabase removed. Uses our own JWT (issued by Laravel).
 * Reads the Bearer token from the Authorization header and decodes it.
 */
import { createMiddleware } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'

export const requireSupabaseAuth = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const request = getRequest();
    const authHeader = request?.headers?.get('authorization') ?? '';

    if (!authHeader.startsWith('Bearer ')) {
      throw new Response('Unauthorized', { status: 401 });
    }

    const token = authHeader.slice(7);

    try {
      const payloadB64 = token.split('.')[1];
      const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));

      if (!payload.sub || payload.exp * 1000 < Date.now()) {
        throw new Response('Unauthorized: token expired', { status: 401 });
      }

      return next({ context: { userId: payload.sub as string, claims: payload } });
    } catch {
      throw new Response('Unauthorized', { status: 401 });
    }
  }
)
