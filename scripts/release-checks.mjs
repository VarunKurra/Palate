import {existsSync,readFileSync,readdirSync,statSync} from 'node:fs';
import path from 'node:path';

export const pageRoutes=['','menu','login','signup','invite','dashboard','admin','reset-password','product','pricing','how-it-works','support','privacy','terms'];
export function filesUnder(root){return readdirSync(root,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?filesUnder(path.join(root,entry.name)):[path.join(root,entry.name)]);}
export function checkRelease(root){
 const errors=[];
 for(const route of pageRoutes){
  const file=path.join(root,route,'index.html');
  if(!existsSync(file)){errors.push(`Missing page: /${route}`);continue;}
  const html=readFileSync(file,'utf8');
  if(!html.includes('favicon.svg'))errors.push(`Missing SVG favicon: ${file}`);
  if(!html.includes('apple-touch-icon'))errors.push(`Missing mobile icon: ${file}`);
 }
 for(const file of filesUnder(root)){
  const relative=path.relative(root,file);
  if(/(^|[/\\])(node_modules|src|\.git|\.env[^/]*|supabase|work)([/\\]|$)|\.(sql|map|pem|key)$/.test(relative))errors.push(`Private/source file in public build: ${relative}`);
  if(statSync(file).size>95*1024*1024)errors.push(`Asset too large for GitHub: ${relative}`);
  if(!/\.(html|js|json|css|txt|svg)$/.test(file))continue;
  const text=readFileSync(file,'utf8');
  if(/sb_secret_[A-Za-z0-9_-]+|sbp_[a-f0-9]{40}|-----BEGIN (?:RSA )?PRIVATE KEY-----/.test(text))errors.push(`Possible private credential in ${relative}`);
  if(/\.(html|css)$/.test(file)){
   const refs=file.endsWith('.html')?[...text.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map(m=>m[1]):[...text.matchAll(/url\(["']?([^)'"\s]+)["']?\)/g)].map(m=>m[1]);
   for(const ref of refs){
    if(/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(ref))continue;
    const pathname=decodeURIComponent(ref.split(/[?#]/)[0]);
    if(!pathname||pathname.startsWith('#'))continue;
    let target=pathname.startsWith('/')?path.join(root,pathname):path.resolve(path.dirname(file),pathname);
    if(existsSync(target)&&statSync(target).isDirectory())target=path.join(target,'index.html');
    if(!existsSync(target))errors.push(`Broken asset/link in ${relative}: ${ref}`);
   }
  }
 }
 if(!existsSync(path.join(root,'favicon.ico')))errors.push('Missing fallback /favicon.ico');
 if(!existsSync(path.join(root,'404.html')))errors.push('Missing 404 page');
 return errors;
}
