import {createPortal} from 'react-dom';
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {ArrowUpRight,Maximize2,Minimize2,RefreshCw} from 'lucide-react';
import {publicMenu} from './client';
import {previewMenuData} from './preview-data.mjs';
export default function MenuPreview({restaurant,items=[],categories=[],deals=[],branding=false}){
 const frame=useRef(null),[ready,setReady]=useState(false),[expanded,setExpanded]=useState(false),[version,setVersion]=useState(0);
 const payload=useMemo(()=>previewMenuData(restaurant,items,categories,deals),[restaurant,items,categories,deals]);
 const latest=useRef(payload);latest.current=payload;
 const send=()=>frame.current?.contentWindow?.postMessage({type:'palate:preview-data',menu:latest.current},location.origin);
 useEffect(()=>{const receive=e=>{if(e.origin===location.origin&&e.source===frame.current?.contentWindow&&e.data?.type==='palate:preview-ready'){setReady(true);send();}};window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive);},[]);
 useEffect(()=>{if(ready)send();},[payload,ready]);
 useEffect(()=>{if(!expanded)return;const previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';const close=e=>{if(e.key==='Escape')setExpanded(false);};document.addEventListener('keydown',close);return()=>{document.removeEventListener('keydown',close);document.body.style.overflow=previousOverflow;};},[expanded]);
 const preview=<section className={`menu-studio${branding?'':' overview-menu-studio'}${expanded?' is-expanded':''}`} aria-label="Interactive menu preview">
  <header className="menu-studio-heading"><div><h2>{branding?'Preview your changes':'Your menu'}</h2><span>{branding?'Updates as you edit':restaurant.status==='active'?'Guest view':'Draft preview'}</span></div><div className="menu-studio-tools"><button type="button" className="icon-btn" aria-label="Restart menu preview" onClick={()=>{setReady(false);setVersion(v=>v+1);}}><RefreshCw size={17}/></button><button type="button" className="icon-btn" aria-label={expanded?'Close expanded preview':'Expand menu preview'} aria-pressed={expanded} onClick={()=>setExpanded(v=>!v)}>{expanded?<Minimize2 size={18}/>:<Maximize2 size={18}/>}</button><a className="icon-btn" href={publicMenu(restaurant)} target="_blank" rel="noreferrer" aria-label="Open menu in a new tab"><ArrowUpRight size={20}/></a></div></header>
  <div className="menu-studio-surface"><div className="menu-studio-viewport">{!ready&&<div className="preview-loading" role="status"><img src="/assets/palate-logo.svg" alt=""/><span>Loading your menu…</span></div>}<iframe key={version} ref={frame} src="/menu/?embed=1" title={`${restaurant.name} interactive menu preview`} onLoad={send}/></div></div>
 </section>;
 return expanded?createPortal(preview,document.body):preview;
}
