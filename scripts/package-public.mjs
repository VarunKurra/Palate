import {mkdirSync,copyFileSync,cpSync,rmSync,existsSync,writeFileSync,readFileSync} from 'node:fs';
const out='dist';rmSync(out,{recursive:true,force:true});mkdirSync(out);
for(const f of ['index.html','styles.css','script.js','homepage-motion.js','config.js'])copyFileSync(f,out+'/'+f);
cpSync('assets',out+'/assets',{recursive:true});
for(const route of ['login','signup','invite','dashboard','admin','reset-password','product','pricing','how-it-works','support','privacy','terms'])cpSync(route,out+'/'+route,{recursive:true});
mkdirSync(out+'/platform');for(const f of ['app.js','app.css','app.js.LEGAL.txt','menu-import-example.csv'])if(existsSync('platform/'+f))copyFileSync('platform/'+f,out+'/platform/'+f);
mkdirSync(out+'/menu');for(const f of ['index.html','app.js','app.css','app.js.LEGAL.txt','menu-data.json','language-manifest.json'])if(existsSync('menu/'+f))copyFileSync('menu/'+f,out+'/menu/'+f);
for(const folder of ['assets','locales'])cpSync('menu/'+folder,out+'/menu/'+folder,{recursive:true});
cpSync('menu/src/menu-engine.mjs','supabase/functions/_shared/menu-engine.mjs');
writeFileSync(out+'/404.html','<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page not found · Palate</title><style>body{font-family:system-ui;background:#f5f5f5;color:#242424;display:grid;place-content:center;min-height:90vh;padding:25px}h1{font-size:42px;letter-spacing:-1.5px}p{color:#646464;line-height:1.6}a{color:inherit}</style><h1>This page isn’t on the menu.</h1><p>The address may have changed.</p><a href="/">Back to Palate →</a></html>');
writeFileSync(out+'/robots.txt','User-agent: *\nDisallow: /admin/\nDisallow: /dashboard/\nDisallow: /reset-password/\nDisallow: /invite/\n');
writeFileSync(out+'/_headers',`/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n/admin/*\n  X-Robots-Tag: noindex, nofollow\n/dashboard/*\n  X-Robots-Tag: noindex, nofollow\n`);
console.log('Public build is in dist/. Source, dependencies, SQL and local configuration are excluded.');

copyFileSync('assets/favicon.ico',out+'/favicon.ico');
