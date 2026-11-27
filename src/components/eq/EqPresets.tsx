import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getSetting, setSetting } from "@/services/db";
import { readEq, type EqSettings } from "@/services/equalizer";

interface Preset { name: string; settings: EqSettings }
const factory: Preset[] = [
  {name:"Flat", settings:readEq(null)},
  {name:"Bass boost", settings:readEq({advanced:true,bands:[4,4,3,1,0,0,0,0,0,0]})},
  {name:"Vocal clarity", settings:readEq({advanced:true,bands:[-2,-2,-1,0,1,2,3,1,0,0]})},
  {name:"Treble boost", settings:readEq({advanced:true,bands:[0,0,0,0,0,0,1,2,3,4]})},
];
function preset(raw: unknown): Preset {
  const item = raw as Partial<Preset> | null;
  if (!item || typeof item.name !== "string" || !item.name.trim() || item.name.length > 80 ||
      !item.settings || !Array.isArray(item.settings.bands) || item.settings.bands.length !== 10 ||
      !item.settings.bands.every(Number.isFinite)) throw Error("Invalid equalizer preset.");
  return {name:item.name.trim(),settings:readEq(item.settings)};
}

export function EqPresets({eq,apply}:{eq:EqSettings;apply:(eq:EqSettings)=>void}) {
  const [user,setUser] = useState<Preset[]>([]);
  const [selected,select] = useState("");
  const [name,setName] = useState("");
  const [ready,setReady] = useState(false);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const all = [...factory,...user];
  useEffect(() => {
    let active=true;
    void getSetting("eq_presets").then(raw => {
      const entries: Preset[] = raw ? JSON.parse(raw).map(preset) : [];
      if(active) {setUser(entries);setReady(true);}
    }).catch(e=>{if(active)setError(String(e));});
    return () => {active=false;};
  },[]);
  async function run(action:()=>Promise<void>) {
    setBusy(true);setError("");
    try {await action();} catch(e) {setError(String(e));} finally {setBusy(false);}
  }
  async function save(entries:Preset[], chosen:string) {
    await setSetting("eq_presets",JSON.stringify(entries));setUser(entries);select(chosen);setName(chosen);
  }
  function unique(value:string) {
    const label=value.trim();
    if(!label || label.length>80 || all.some(p=>p.name.toLowerCase()===label.toLowerCase())) throw Error("Choose a unique preset name of up to 80 characters.");
    return label;
  }
  const custom=user.find(p=>p.name===selected);
  return <fieldset disabled={busy || !ready} className="mt-3 flex flex-wrap items-center gap-3 text-xs">
    <label>Preset <select className="bg-bg-dark p-1" value={selected} onChange={e=>{
      const p=all.find(v=>v.name===e.target.value);select(p?.name ?? "");setName(p?.name ?? "");if(p)apply(p.settings);
    }}><option value="">Current settings</option>{all.map(p=><option key={p.name}>{p.name}</option>)}</select></label>
    <input value={name} onChange={e=>setName(e.target.value)} maxLength={80} aria-label="Preset name" placeholder="Preset name"
      className="w-32 border-b border-non-text/40 bg-transparent py-1"/>
    <button disabled={!name.trim()} onClick={()=>void run(async()=>{
      if(custom && name.trim()===custom.name) await save(user.map(p=>p===custom?{name:p.name,settings:eq}:p),custom.name);
      else {const label=unique(name);await save([...user,{name:label,settings:eq}],label);}
    })}>Save preset</button>
    {custom && <><button disabled={!name.trim() || name.trim()===selected} onClick={()=>void run(async()=>{
      const label=unique(name);await save(user.map(p=>p===custom?{...p,name:label}:p),label);
    })}>Rename</button><button onClick={()=>void run(()=>save(user.filter(p=>p!==custom),""))}>Delete preset</button></>}
    <button onClick={()=>file.current?.click()}>Import</button><input type="file" accept=".json" hidden ref={file} onChange={e=>{
      const f=e.target.files?.[0];e.target.value="";if(f)void run(async()=>{
        if(f.size>16384)throw Error("Choose a preset under 16 KiB.");
        const p=preset(JSON.parse(await f.text()));
        const base=p.name;
        for(let i=2; all.some(item=>item.name.toLowerCase()===p.name.toLowerCase()); i++) {
          const suffix=" ("+i+")";p.name=base.slice(0,80-suffix.length)+suffix;
        }
        await save([...user,p],p.name);apply(p.settings);
      });
    }}/>
    <button onClick={()=>void run(async()=>{await invoke("export_eq_preset",{text:JSON.stringify({name:name.trim()||"My equalizer",settings:eq},null,2)});})}>Export</button>
    {error && <span role="alert">{error}</span>}
  </fieldset>;
}
