import { useState } from 'react';

/**
 * Shared presentational auth form. `fields` describes inputs; `onSubmit`
 * receives the collected values and may throw to surface a server error.
 *
 * @param {{
 *   title: string,
 *   fields: { name: string, label: string, type?: string }[],
 *   submitLabel: string,
 *   onSubmit: (values: Record<string,string>) => Promise<void>,
 *   footer?: React.ReactNode
 * }} props
 */
export function AuthForm({ title, fields, submitLabel, onSubmit, footer }) {
  const [values, setValues] = useState(() =>
    Object.fromEntries(fields.map((f) => [f.name, ''])),
  );
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (name) => (e) =>
    setValues((prev) => ({ ...prev, [name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(values);
    } catch (err) {
      const apiError = err?.response?.data?.error;
      setError(apiError?.message ?? 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h1>{title}</h1>
      {fields.map((f) => (
        <label key={f.name} className="auth-field">
          <span>{f.label}</span>
          <input
            name={f.name}
            type={f.type ?? 'text'}
            value={values[f.name]}
            onChange={handleChange(f.name)}
            autoComplete={f.type === 'password' ? 'current-password' : 'off'}
          />
        </label>
      ))}
      {error && (
        <p role="alert" className="auth-error">
          {error}
        </p>
      )}
      <button type="submit" disabled={submitting}>
        {submitting ? 'Please wait…' : submitLabel}
      </button>
      {footer}
    </form>
  );
}
