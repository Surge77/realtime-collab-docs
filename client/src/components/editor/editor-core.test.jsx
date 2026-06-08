import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { EditorCore } from './editor-core.jsx';

afterEach(cleanup);

describe('EditorCore', () => {
  it('renders a CodeMirror editor surface', () => {
    render(<EditorCore />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('seeds the editor with the provided initial document', () => {
    render(<EditorCore initialDoc="hello collab" />);
    expect(screen.getByRole('textbox')).toHaveTextContent('hello collab');
  });

  it('mounts the CodeMirror DOM (.cm-editor) inside its container', () => {
    const { container } = render(<EditorCore />);
    expect(container.querySelector('.cm-editor')).not.toBeNull();
  });
});
