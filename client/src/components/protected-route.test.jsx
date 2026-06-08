import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ProtectedRoute } from './protected-route.jsx';
import { useAuthStore } from '../store/auth-store.js';

afterEach(cleanup);
beforeEach(() => useAuthStore.setState({ user: null, accessToken: null, status: 'idle' }));

function renderAt(status) {
  useAuthStore.setState({ status });
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <div>secret content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>login page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  it('redirects to /login when unauthenticated', () => {
    renderAt('unauthenticated');
    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('renders children when authenticated', () => {
    renderAt('authenticated');
    expect(screen.getByText('secret content')).toBeInTheDocument();
  });

  it('shows a loading state while the session resolves', () => {
    renderAt('loading');
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });
});
