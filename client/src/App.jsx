import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { ErrorBoundary } from './components/error-boundary.jsx';
import { ProtectedRoute } from './components/protected-route.jsx';
import { Home } from './pages/home.jsx';
import { Login } from './pages/login.jsx';
import { Register } from './pages/register.jsx';
import { EditorPage } from './pages/editor-page.jsx';
import { NotFound } from './pages/not-found.jsx';
import { useAuthStore } from './store/auth-store.js';

export function App() {
  const status = useAuthStore((s) => s.status);
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const redirectIfAuthed = (element) =>
    status === 'authenticated' ? <Navigate to="/" replace /> : element;

  return (
    <ErrorBoundary>
    <Routes>
      <Route path="/login" element={redirectIfAuthed(<Login />)} />
      <Route path="/register" element={redirectIfAuthed(<Register />)} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/doc/:id"
        element={
          <ProtectedRoute>
            <EditorPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
    </ErrorBoundary>
  );
}
