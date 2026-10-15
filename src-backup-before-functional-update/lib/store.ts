export type DataRecord = { id:string; createdAt:string; updatedAt:string; [key:string]:any };
const prefix = "studentflow:";
export function readRecords(key:string):DataRecord[]{
  if(typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(prefix+key) || "[]"); } catch { return []; }
}
export function writeRecords(key:string, records:DataRecord[]){
  localStorage.setItem(prefix+key, JSON.stringify(records));
  window.dispatchEvent(new Event("studentflow-data"));
}
export function makeId(key:string){return `${key.slice(0,4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`}
export function upsertRecord(key:string, values:Record<string,any>, id?:string){
  const rows=readRecords(key); const now=new Date().toISOString();
  if(id){ const next=rows.map(r=>r.id===id?{...r,...values,updatedAt:now}:r); writeRecords(key,next); return next.find(r=>r.id===id)!; }
  const row={id:makeId(key),createdAt:now,updatedAt:now,...values}; writeRecords(key,[row,...rows]); return row;
}
export function removeRecord(key:string,id:string){writeRecords(key,readRecords(key).filter(r=>r.id!==id));}
export function exportCsv(filename:string,rows:DataRecord[]){
  const keys=Array.from(new Set(rows.flatMap(r=>Object.keys(r).filter(k=>!['id','createdAt','updatedAt'].includes(k)))));
  const esc=(v:any)=>`"${String(v??"").replaceAll('"','""')}"`;
  const csv=[keys.join(","),...rows.map(r=>keys.map(k=>esc(r[k])).join(","))].join("\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);
}
export function seedIfEmpty(key:string, seed:DataRecord[]){if(readRecords(key).length===0&&seed.length)writeRecords(key,seed);}
export function money(v:any){return new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:2}).format(Number(v)||0)}
