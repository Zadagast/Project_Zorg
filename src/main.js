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
  console.error('Unhandled rejection:', event.reason);
});

new Game();
