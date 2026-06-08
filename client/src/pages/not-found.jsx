import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="route-error">
      <h1>404</h1>
      <p>That page doesn’t exist.</p>
      <Link to="/">Go home</Link>
    </div>
  );
}
