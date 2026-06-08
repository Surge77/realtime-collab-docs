/**
 * Avatars of the people currently in the document (excludes the local user).
 * @param {{ collaborators: { userId: string, name: string, color: string }[] }} props
 */
export function CollaboratorList({ collaborators }) {
  if (collaborators.length === 0) return null;

  return (
    <div className="collaborators" aria-label="Active collaborators">
      {collaborators.map((c) => (
        <span
          key={c.userId}
          className="collaborator-avatar"
          style={{ backgroundColor: c.color }}
          title={c.name}
        >
          {c.name?.[0]?.toUpperCase() ?? '?'}
        </span>
      ))}
    </div>
  );
}
