export const BLADE_END = .55;

// The opening cleave keeps its full strength. Later beats seek fresh targets,
// rather than dividing that hit or repeatedly damaging the same enemy.
export function bladeFollowups(rank) {
  const contacts = rank >= 5 ? [.31, .44] : rank >= 3 ? [.34] : [];
  return contacts.map((at, index) => ({
    at, prepareAt: at - .08, direction: index % 2 ? 1 : -1,
    prepared: false, resolved: false, targetId: null, angle: 0
  }));
}

export function bladeGrowth(rank) {
  return rank === 3 ? '새 적 1명까지 이어 베기' : rank === 5 ? '새 적 2명까지 이어 베기' : '';
}

const releaseAge = (age, contact) => contact === 0 ? age
  : .18 + Math.max(0, Math.min(1, (age - contact) / (BLADE_END - contact))) * .37;

// Share the actual contact schedule with all three sprite/render paths. A
// regrip blends out of the previous release before the next real contact.
export function bladeMotion(swing) {
  let previous = {at: 0, angle: swing.angle, direction: 1};
  for (const beat of swing.followups ?? []) {
    if (!beat.prepared || beat.targetId === null || swing.age < beat.prepareAt) continue;
    if (swing.age < beat.at) {
      const progress = Math.max(0, Math.min(1, (swing.age - beat.prepareAt) / (beat.at - beat.prepareAt)));
      return {age: progress * .18, angle: beat.angle, direction: beat.direction,
        regrip: {progress, age: releaseAge(beat.prepareAt, previous.at), angle: previous.angle, direction: previous.direction}};
    }
    previous = beat;
  }
  return {age: releaseAge(swing.age, previous.at), angle: previous.angle, direction: previous.direction};
}
