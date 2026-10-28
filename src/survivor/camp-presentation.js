// Keep decoded artwork on the stage while a newly selected portrait loads.
// Tickets belong to a scene, so late image responses cannot undo a later choice.
const requests = new WeakMap();

export function reuseCampScene(previous, next, reduced = () => false, active = () => true) {
  if (!previous || !next) return;
  const incoming = next.querySelector('.camp-portrait');
  const fallback = next.closest('.camp-stage').querySelector('[data-character][aria-pressed="true"] .companion-art')?.cloneNode(true);
  next.replaceWith(previous);
  if (!incoming) return;
  const source = incoming.src;
  if (requests.get(previous)?.source === source) return;
  const ticket = {source};
  requests.set(previous, ticket);
  const current = previous.querySelector('.camp-portrait');
  if (current?.src === source && current.complete && current.naturalWidth) {
    delete previous.dataset.loading;
    return;
  }
  previous.dataset.loading = 'true';
  const stillCurrent = () => requests.get(previous) === ticket && previous.isConnected && active();
  const show = failed => {
    if (!stillCurrent()) return;
    delete previous.dataset.loading;
    previous.querySelector('.camp-portrait-outgoing')?.remove();
    const before = previous.querySelector('.camp-portrait,.camp-fallback');
    const after = failed && fallback ? fallback : incoming;
    if (failed) {
      requests.delete(previous);
      after.className = 'hero-art camp-fallback';
      previous.replaceChildren(after);
      return;
    }
    if (before && !reduced()) {
      before.className = 'hero-art camp-portrait-outgoing';
      previous.replaceChildren(before, after);
      const fade = before.animate([{opacity:1},{opacity:0}],{duration:160});
      fade.finished.then(()=>before.remove(),()=>before.remove());
      after.animate([{opacity:.3,transform:'translateX(6px)'},{opacity:1,transform:'none'}],{duration:180,easing:'ease-out'});
    } else previous.replaceChildren(after);
  };
  if (incoming.complete && incoming.naturalWidth) show(false);
  else incoming.decode().then(()=>show(false),()=>show(true));
}
