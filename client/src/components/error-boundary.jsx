import { Component } from 'react';

// Error boundaries must be class components (no hook equivalent exists).
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    // eslint-disable-next-line no-console
    console.error('Uncaught error in React tree:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="route-error">
            <h1>Something went wrong</h1>
            <p>Try reloading the page.</p>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
