/* utils.js
   Shared helper utilities for Quiz App.
*/

// Global Utils object
window.Utils = (function () {
  'use strict';

  // Shuffle array (Fisher–Yates)
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Format seconds into HH:MM:SS or MM:SS
  function formatTime(sec) {
    sec = Math.max(0, Math.floor(sec));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  // Download text file
  function downloadText(filename, text) {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Read uploaded file as text
  function readFileText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  // Base64 encode file
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Prevent copy/paste/right-click inside an element
  function applyAntiCheat(el) {
    if (!el) return;
    el.addEventListener('contextmenu', e => e.preventDefault());
    el.addEventListener('copy', e => e.preventDefault());
    el.addEventListener('paste', e => e.preventDefault());
    el.addEventListener('cut', e => e.preventDefault());
    el.addEventListener('keydown', e => {
      const blockCombos = [
        e.ctrlKey && ['c', 'v', 'x', 's', 'u'].includes(e.key.toLowerCase()),
        e.key === 'F12',
        (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'i')
      ];
      if (blockCombos.some(Boolean)) e.preventDefault();
    });
  }

  return {
    shuffle,
    formatTime,
    downloadText,
    readFileText,
    fileToBase64,
    applyAntiCheat
  };
})();
