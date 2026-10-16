// Small review shell, separate from the retained look-development GUI.
export function createPilotReview({ mode, onView, onLighting, onReset }) {
  const panel = document.createElement('section');
  panel.id = 'pilot-review';
  panel.setAttribute('aria-label', 'Environment review');
  panel.style.cssText = 'position:fixed;top:12px;left:12px;z-index:20;max-width:min(390px,calc(100vw - 32px));padding:14px;background:rgba(16,23,28,.92);color:#edf2f5;font:13px/1.5 system-ui,sans-serif;border:1px solid #647581;border-radius:6px;box-sizing:border-box';
  const title = document.createElement('strong');
  title.textContent = mode === 'pilot' ? 'Entrance / hall — prototype review' : 'Look-development sandbox';
  const links = document.createElement('nav');
  for (const [name, label] of [['pilot', 'Pilot'], ['sandbox', 'Sandbox']]) {
    const link = document.createElement('a');
    link.href = `?mode=${name}`;
    link.textContent = label;
    link.style.cssText = 'color:#bde0ff;margin-right:14px';
    if (name === mode) link.setAttribute('aria-current', 'page');
    links.append(link);
  }
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  status.style.margin = '8px 0';
  const controls = document.createElement('div');
  controls.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px';
  const views = document.createElement('select');
  views.setAttribute('aria-label', 'Fixed comparison view');
  views.addEventListener('change', () => onView(views.value));
  controls.append(views);
  for (const lighting of ['neutral', 'dusk']) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = lighting === 'neutral' ? 'Neutral' : 'Dusk';
    button.addEventListener('click', () => onLighting(lighting));
    controls.append(button);
  }
  const reset = document.createElement('button');
  reset.type = 'button';
  reset.textContent = 'Walk from entrance';
  reset.addEventListener('click', onReset);
  controls.append(reset);
  const help = document.createElement('p');
  help.style.margin = '8px 0 0';
  help.textContent = 'Click scene to capture · WASD walk · Shift sprint · F flashlight · Esc release. Overhead is inspection only; choose a ground view to walk.';
  panel.append(title, links, status);
  if (mode === 'pilot') panel.append(controls);
  panel.append(help);
  document.body.append(panel);

  function setStatus(state, message) {
    status.textContent = message;
    panel.dataset.state = state;
    status.setAttribute('role', state === 'error' ? 'alert' : 'status');
    for (const control of controls.children) control.disabled = state !== 'ready';
  }
  setStatus('loading', mode === 'pilot' ? 'Loading pilot geometry, walking data and lighting…' : 'Loading sandbox…');
  return {
    setStatus,
    setViews(items) {
      views.replaceChildren();
      for (const view of items) {
        const option = document.createElement('option');
        option.value = view.id;
        option.textContent = `${view.label ?? view.id}${view.inspection ? ' (inspect)' : ' (walk)'}`;
        views.append(option);
      }
    },
    setActiveView(id) { views.value = id; },
  };
}
