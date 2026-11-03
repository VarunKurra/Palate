import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {checkRelease,pageRoutes} from './release-checks.mjs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {getTransformedRoutes}=require('../platform/node_modules/@vercel/routing-utils');
test('Vercel builds both applications and serves folder routes without rewriting unknown URLs',()=>{
 const config=JSON.parse(readFileSync('vercel.json'));
 assert.equal(config.outputDirectory,'dist');assert.equal(config.installCommand,'npm run install:apps');
 assert.equal(config.buildCommand,'npm run build:vercel');assert.equal(config.trailingSlash,true);
 assert.equal(config.rewrites,undefined);
 const csp=config.headers[0].headers.find(h=>h.key==='Content-Security-Policy').value;
 assert.match(csp,/object-src 'none'/);assert.match(csp,/supabase\.co/);
 // Customer menu embeds remain allowed; the rest of the app disallows framing.
 assert.doesNotMatch(csp,/frame-ancestors/);
 assert.match(config.headers[1].headers[0].value,/frame-ancestors 'self'/);
 const compiled=getTransformedRoutes(config);assert.equal(compiled.error,null);
 const headersFor=url=>Object.assign({},...compiled.routes.filter(r=>r.continue&&new RegExp(r.src).test(url)).map(r=>r.headers));
 for(const route of ['admin','dashboard','login','signup','invite','reset-password']){
  for(const suffix of ['', '/', '/index.html']){
   const headers=headersFor('/'+route+suffix);
   assert.equal(headers['X-Robots-Tag'],'noindex, nofollow');
   assert.equal(headers['Cache-Control'],'private, no-store');
  }
 }
 assert.doesNotMatch(headersFor('/menu/')['Content-Security-Policy'],/frame-ancestors/);
 assert.match(headersFor('/')['Content-Security-Policy'],/frame-ancestors 'self'/);
});
test('release check catches broken assets and accidentally packaged credentials/source',()=>{
 const root=mkdtempSync(path.join(tmpdir(),'palate-check-'));
 try{
  for(const route of pageRoutes){mkdirSync(path.join(root,route),{recursive:true});writeFileSync(path.join(root,route,'index.html'),'<link rel="icon" href="/favicon.svg"><link rel="apple-touch-icon" href="/icon.png">');}
  for(const file of ['favicon.svg','icon.png','favicon.ico','404.html'])writeFileSync(path.join(root,file),'');
  assert.deepEqual(checkRelease(root),[]);
  writeFileSync(path.join(root,'index.html'),'<link href="missing.css">');
  mkdirSync(path.join(root,'src'));writeFileSync(path.join(root,'src','private.js'),'');
  const errors=checkRelease(root);assert.ok(errors.some(e=>e.includes('missing.css')));assert.ok(errors.some(e=>e.includes('Private/source')));
 }finally{rmSync(root,{recursive:true,force:true});}
});
