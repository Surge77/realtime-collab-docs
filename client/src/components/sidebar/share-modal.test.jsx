import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../services/document-service.js', () => ({
  listCollaborators: vi.fn(),
  shareDocument: vi.fn(),
  removeCollaborator: vi.fn(),
}));

import {
  listCollaborators,
  shareDocument,
} from '../../services/document-service.js';
import { ShareModal } from './share-modal.jsx';

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  listCollaborators.mockResolvedValue([
    { userId: 'u2', username: 'bob', role: 'editor' },
  ]);
});

describe('ShareModal', () => {
  it('lists existing collaborators', async () => {
    render(<ShareModal documentId="doc-1" onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText(/bob · editor/)).toBeInTheDocument());
  });

  it('shares with a new email and refreshes the list', async () => {
    shareDocument.mockResolvedValue({ userId: 'u3', username: 'cara', role: 'viewer' });
    render(<ShareModal documentId="doc-1" onClose={() => {}} />);

    fireEvent.change(screen.getByLabelText('Collaborator email'), {
      target: { value: 'cara@example.com' },
    });
    fireEvent.click(screen.getByText('Invite'));

    await waitFor(() => expect(shareDocument).toHaveBeenCalledWith('doc-1', 'cara@example.com', 'editor'));
  });

  it('surfaces a server error', async () => {
    shareDocument.mockRejectedValue({ response: { data: { error: { message: 'No user with that email' } } } });
    render(<ShareModal documentId="doc-1" onClose={() => {}} />);

    fireEvent.change(screen.getByLabelText('Collaborator email'), {
      target: { value: 'ghost@example.com' },
    });
    fireEvent.click(screen.getByText('Invite'));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('No user with that email'));
  });
});
