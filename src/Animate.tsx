/**
 * Modern View Transitions API - Dynamic Assignment (2025)
 * No CSS rule generation, unlimited IDs, proper cleanup
 */

export const assignTransitionNames = (rootElement: HTMLElement | null, actionType: string) => {
  if (!rootElement) return;

  // Find all nodes that should animate
  const nodes = rootElement.querySelectorAll('[id^="node-"]') as NodeListOf<HTMLElement>;
  const syms = rootElement.querySelectorAll('[id^="sym-"]') as NodeListOf<HTMLElement>;
  
  nodes.forEach(el => {
    const id = el.id.split('-')[1];
    const hasAnimateClass = el.classList.contains('animate');
    // Only assign transition names to nodes that should animate
    if (hasAnimateClass) {
      el.style.viewTransitionName = `flip-node-${id}`;
    }
  });
  
  // Assign symbol transition names for specific action types
  if (['unsetSelections', 'setSelect', 'moveStage'].includes(actionType)) {
    syms.forEach(el => {
      const id = el.id.split('-')[1];
      el.style.viewTransitionName = `flip-sym-${id}`;
    });
  }

  // Handle selected node transition
  if (['setSelect', 'unsetSelections'].includes(actionType)) {
    const selected = rootElement.querySelector('.selected') as HTMLElement;
    if (selected) {
      selected.style.viewTransitionName = 'flip-node-selected';
    }
    
    const logo = rootElement.querySelector('.logo') as HTMLElement;
    const seed = rootElement.querySelector('#seed') as HTMLElement;
    if (logo) logo.style.viewTransitionName = 'setSelect-logo';
    if (seed) seed.style.viewTransitionName = 'setSelect-seed';
  }
};

export const cleanupTransitionNames = (rootElement: HTMLElement | null) => {
  if (!rootElement) return;
  
  // Clean up root element transition name
  if (rootElement.style.viewTransitionName) {
    rootElement.style.viewTransitionName = '';
  }
  
  // Check nodes and syms specifically since we know we assigned to them
  const nodes = rootElement.querySelectorAll('[id^="node-"]') as NodeListOf<HTMLElement>;
  const syms = rootElement.querySelectorAll('[id^="sym-"]') as NodeListOf<HTMLElement>;
  
  nodes.forEach(el => {
    if (el.style.viewTransitionName) {
      el.style.viewTransitionName = '';
    }
  });
  
  syms.forEach(el => {
    if (el.style.viewTransitionName) {
      el.style.viewTransitionName = '';
    }
  });
};

// Minimal init - just add base CSS for transition styling
export const init = (): void => {
  const style = document.createElement("style");
  style.innerHTML = `
    /* Base transition timing for all view transitions */
    ::view-transition-group(*) {
      animation-duration: calc(var(--anim-factor) * 0.25s);
      animation-fill-mode: both;
      animation-timing-function: cubic-bezier(0.68, -0.6, 0.32, 1.6);
    }
    
    ::view-transition-new(*) {
      height: 100%;
      width: 100%;
    }
    
    ::view-transition-old(*) {
      height: 100%;
      width: 100%;
    }
  `;
  document.getElementsByTagName("head")[0].appendChild(style);
};
