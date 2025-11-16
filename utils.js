// utils.js
export function $(sel, parent=document){
  return parent.querySelector(sel);
}
export function $all(sel, parent=document){
  return Array.from(parent.querySelectorAll(sel));
}

export function formatTimeSeconds(sec){
  sec = Math.max(0, Math.floor(sec));
  const mm = String(Math.floor(sec/60)).padStart(2,'0');
  const ss = String(sec%60).padStart(2,'0');
  return `${mm}:${ss}`;
}

export function uid(prefix='id'){
  return `${prefix}-${Math.random().toString(36).slice(2,9)}`;
}

/* Anti-cheat scaffolding helpers (fleshed later) */
export function blockCopyPaste(el = document){
  el.addEventListener('copy', e => e.preventDefault());
  el.addEventListener('paste', e => e.preventDefault());
}
