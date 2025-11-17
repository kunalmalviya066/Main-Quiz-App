/* utils.js - small helpers */
(function(global){
  const utils = {};

  utils.uid = function(prefix='id'){
    return prefix + '_' + Math.random().toString(36).slice(2,9);
  };

  utils.shuffle = function(arr, rnd=Math.random){
    const a = arr.slice();
    for(let i=a.length-1;i>0;i--){
      const j = Math.floor(rnd()*(i+1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // simple seedable RNG (mulberry32)
  utils.seededRng = function(seed){
    let t = seed >>> 0;
    return function(){
      t += 0x6D2B79F5;
      let r = Math.imul(t ^ t >>> 15, 1 | t);
      r ^= r + Math.imul(r ^ r >>> 7, 61 | r);
      return ((r ^ r >>> 14) >>> 0) / 4294967296;
    };
  };

  utils.formatTime = function(totalSec){
    if (totalSec <= 0) return "00:00";
    const m = Math.floor(totalSec/60);
    const s = totalSec%60;
    return String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
  };

  utils.nowISODate = function(){
    return new Date().toISOString().slice(0,10);
  };

  utils.downloadJSON = function(filename, data){
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click();
    setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 250);
  };

  global.utils = utils;
})(window);
