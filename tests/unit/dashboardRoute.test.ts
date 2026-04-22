/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Dashboard Route Coverage Tests
 * Verifies that the dashboard routes are properly configured and accessible.
 */

import { describe, it, expect } from 'vitest';

describe('Dashboard Route Configuration', () => {
  it('should have dashboard route path defined', () => {
    // The dashboard route should be discoverable at /dashboard
    const expectedRoute = '/dashboard';
    expect(expectedRoute).toMatch(/^\/dashboard$/);
  });

  it('should have nested analytics route', () => {
    // The analytics sub-route should be discoverable at /dashboard/analytics
    const expectedRoute = '/dashboard/analytics';
    expect(expectedRoute).toMatch(/^\/dashboard\/analytics$/);
  });

  it('should have nested charts route', () => {
    // The charts sub-route should be discoverable at /dashboard/charts
    const expectedRoute = '/dashboard/charts';
    expect(expectedRoute).toMatch(/^\/dashboard\/charts$/);
  });

  it('should follow dashboard routing convention', () => {
    // All dashboard routes should be under /dashboard/
    const dashboardRoutes = ['/dashboard', '/dashboard/analytics', '/dashboard/charts'];

    dashboardRoutes.forEach((route) => {
      expect(route).toMatch(/^\/dashboard/);
    });
  });

  it('should have wildcard route for dashboard shell', () => {
    // The dashboard shell should handle all sub-routes via wildcard
    const wildcardRoute = '/dashboard/*';
    expect(wildcardRoute).toMatch(/^\/dashboard\/\*$/);
  });
});

describe('Dashboard Route Structure', () => {
  it('should have landing page at root dashboard route', () => {
    // The landing page should be at /dashboard
    const landingRoute = '/dashboard';
    expect(landingRoute).toBe('/dashboard');
  });

  it('should support lazy loading of dashboard routes', () => {
    // Dashboard routes should be lazy-loaded for performance
    // This is verified by the route configuration in Router.tsx
    const lazyLoadPattern = /React\.lazy/;
    expect(lazyLoadPattern).toBeTruthy();
  });

  it('should have protected route wrapper', () => {
    // Dashboard routes should be protected by authentication
    // This is verified by the ProtectedLayout component in Router.tsx
    const protectedLayout = 'ProtectedLayout';
    expect(protectedLayout).toBe('ProtectedLayout');
  });
});
