/* @refresh reload */
import { render } from 'solid-js/web';

import './index.css';
//import 'bootstrap/dist/css/bootstrap.min.css'
import App from './App';
import WorldView from './world/WorldView';

/* ?world: the isometric world mode; bare URL stays the single-tree sandbox */
const world = new URLSearchParams(window.location.search).has('world');

const root = document.getElementById('root');

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    'Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got mispelled?',
  );
}

render(() => (world ? <WorldView /> : <App />), root!);
