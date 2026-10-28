# Make the next combat fork visible

The overall enjoyment goal remains open. The ordinary Grove run on `b939ff8`
finished its Lunar/Bulwark primary around 1:18, acquired Sword1 around 1:37,
and chose Sword2 at 2:30. Duelist appeared at the next level; Dawn followed at
3:42. That is evidence of a long gap between primary completion and a second
meaningful combat choice, not evidence that the pool contains only stat cards.
The player also deliberately chose utility during the gap, so offer frequency
alone cannot establish the cause of boredom.

## Player decision

The player can invest in another attack, compare its two combat styles, or
take the offered utility. The immediate weapon effect remains first on the
card. For unowned and rank-1 weapons, the supporting line names both combat
paths and the actual rank-2 / level-3 eligibility instead of a more distant
evolution recipe. The overview still shows evolution requirements.

If an uncommitted rank-1 weapon is in the current draft, a footer action opens
the existing animated rank-2 comparison. It demonstrates that weapon's two
paths in an independent encounter; it cannot buy a rank or choose a path.
Actual specialization offers retain their existing comparison action. Only
one preview action is added, avoiding multiple nested controls in the cards.
Closing restores the trigger's focus. Time, player state, offers, rerolls and
saved progress stay unchanged. Existing reduced-motion scenes still apply.

## Offer rule

Once the character's primary weapon is both at maximum rank and evolved, an
already owned alternate at rank 1 becomes the continuation offer. It stays
within reach of rank 2, where the existing combat specialization can become a
candidate. It is never granted automatically and the player may skip it.

- Ready evolutions keep first priority; actual specialization offers keep their
  two slots. A full draft can therefore postpone continuation.
- The existing weapon cursor chooses between two rank-1 alternates rather than
  always favoring the same family. Normal drafts retain utility and rotating
  discovery where slots permit.
- Rank 2 and higher use the existing progression. No new stat bonus, currency,
  weapon, saved field, XP acceleration or forced purchase is introduced.
- Early primary investment, incomplete primary evolution, reroll behavior and
  capped recovery fallback retain their prior rules. Rerolls do not promise the
  ordinary continuation slot.

## Verification and limits

248 Node checks pass, including three-character / 12-seed continuation,
two-alternate rotation, utility availability, evolution priority and the actual
rank-2 purchase leading to two branch candidates. Read-only preview helpers
exclude inherited/committed branches and never promise an immediate or next
level selection.

Nine focused browser cases pass across sword/fire/rune and desktop1280,
portrait320 and landscape740. They verify card eligibility copy, the correct
two animated paths, unchanged live run/profile/rerolls, focus restoration,
reachable footer controls, no outer overflow and a real rank-2 purchase without
an automatic branch. Independent review found no remaining P1/P2 issue.
The current interface font covers every Hangul character in the source.

Ordinary play, full CI and public release outcomes are recorded separately
after completion. Preview scenarios are disposable development scenes, not
ordinary play or evidence that the human player now finds the game enjoyable.
