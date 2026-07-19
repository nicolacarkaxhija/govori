import { useCallback, useState } from 'react';
import { activeDirection, directions, setActiveDirection } from '../instance';

function followingLabel(currentId: string): string | undefined {
  const index = directions.findIndex(
    (entry) => entry.direction.id === currentId,
  );
  return directions[(index + 1) % directions.length]?.direction.label;
}

/**
 * Working-direction preference (ADR 0046): one toggle cycling the
 * instance's declared directions, persisted, app-wide. Instances with a
 * single direction have no choice to offer — `hasChoice` is false and
 * the switcher never renders.
 */
export function useDirection() {
  const [directionId, setDirectionId] = useState(
    () => activeDirection().direction.id,
  );
  const cycle = useCallback(() => {
    setDirectionId((current) => {
      const index = directions.findIndex(
        (entry) => entry.direction.id === current,
      );
      const next = directions[(index + 1) % directions.length];
      if (next === undefined) {
        return current;
      }
      setActiveDirection(next.direction.id);
      return next.direction.id;
    });
  }, []);
  return {
    directionId,
    cycle,
    hasChoice: directions.length > 1,
    currentLabel: activeDirection().direction.label,
    nextLabel: followingLabel(directionId),
  };
}
