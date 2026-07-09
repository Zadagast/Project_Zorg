import './style.css';
import { Game } from './core/Game.js';

window.addEventListener('error', (event) => {
  console.error('Game error:', event.error ?? event.message);
  const hint = document.getElementById('hint');
  if (hint) {
    hint.textContent = `Error: ${event.message}. Try a hard refresh (Ctrl+Shift+R).`;
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  if (reason instanceof DOMException && reason.name === 'NotAllowedError') {
    event.preventDefault();
    return;
  }
  console.error('Unhandled rejection:', reason);
});

new Game();
