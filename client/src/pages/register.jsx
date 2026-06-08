import { Link, useNavigate } from 'react-router-dom';

import { AuthForm } from '../components/auth/auth-form.jsx';
import { useAuthStore } from '../store/auth-store.js';

const FIELDS = [
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'username', label: 'Username' },
  { name: 'password', label: 'Password', type: 'password' },
];

export function Register() {
  const register = useAuthStore((s) => s.register);
  const navigate = useNavigate();

  return (
    <div className="auth-page">
      <AuthForm
        title="Create account"
        fields={FIELDS}
        submitLabel="Create account"
        onSubmit={async ({ email, username, password }) => {
          await register(email, username, password);
          navigate('/');
        }}
        footer={<p>Have an account? <Link to="/login">Sign in</Link></p>}
      />
    </div>
  );
}
