export function $(sel, parent=document){ return parent.querySelector(sel); }
export function $all(sel, parent=document){ return [...parent.querySelectorAll(sel)]; }

export function createEl(tag, cls="", html=""){
    const el = document.createElement(tag);
    if(cls) el.className=cls;
    if(html) el.innerHTML=html;
    return el;
}

export function randomId(prefix="id"){
    return prefix+"_"+Math.random().toString(36).substring(2,10);
}

export function safeGet(key, fallback=null){
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
}

export function safeSet(key, val){
    localStorage.setItem(key, JSON.stringify(val));
}

export function formatTime(sec){
    sec = Math.floor(sec);
    const m = Math.floor(sec/60);
    const s = sec%60;
    return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

export function todayString(){
    const d=new Date();
    return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
}

export async function sha256(text){
    const data = new TextEncoder().encode(text);
    const hashBuf = await crypto.subtle.digest("SHA-256",data);
    return [...new Uint8Array(hashBuf)].map(b=>b.toString(16).padStart(2,"0")).join("");
}

export async function fileToBase64(file){
    return new Promise((res,rej)=>{
        const r=new FileReader();
        r.onload = ()=>res(r.result);
        r.onerror = rej;
        r.readAsDataURL(file);
    });
}

export function parseCSV(text){
    const lines=text.trim().split(/\r?\n/);
    const headers=lines[0].split(/[,;]+/).map(x=>x.trim());
    const rows=[];
    for(let i=1;i<lines.length;i++){
        if(!lines[i].trim()) continue;
        const vals=lines[i].split(/[,;]+/).map(v=>v.trim());
        const row={};
        headers.forEach((h,idx)=> row[h]=vals[idx]||"");
        rows.push(row);
    }
    return {headers,rows};
}

export function generateCSV(headers,rows){
    const h=headers.join(",");
    const data=rows.map(r=>headers.map(h=>r[h]??"").join(","));
    return [h,...data].join("\n");
}

export function downloadFile(name,text){
    const blob=new Blob([text],{type:"text/plain"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    a.download=name;
    document.body.appendChild(a);
    a.click();
    setTimeout(()=>{
        URL.revokeObjectURL(url);
        a.remove();
    },200);
}
