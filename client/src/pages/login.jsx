import { Link, useNavigate } from 'react-router-dom';

import { AuthForm } from '../components/auth/auth-form.jsx';
import { useAuthStore } from '../store/auth-store.js';

const FIELDS = [
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'password', label: 'Password', type: 'password' },
];

export function Login() {
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  return (
    <div className="auth-page">
      <AuthForm
        title="Sign in"
        fields={FIELDS}
        submitLabel="Sign in"
        onSubmit={async ({ email, password }) => {
          await login(email, password);
          navigate('/');
        }}
        footer={<p>No account? <Link to="/register">Create one</Link></p>}
      />
    </div>
  );
}
