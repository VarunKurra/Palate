import {normalizeMenu} from './menu-data.mjs';
import {db,result} from '../../platform/src/client.js';
export const embeddedPreview=new URLSearchParams(location.search).get('embed')==='1'&&window.parent!==window;
export const liveSlug=new URLSearchParams(location.search).get('shop');
let visitor;
try{const key='palate-visit:'+liveSlug;const previous=JSON.parse(sessionStorage.getItem(key)||'null');visitor=previous&&Date.now()-previous.time<30*60*1000?previous.id:crypto.randomUUID();sessionStorage.setItem(key,JSON.stringify({id:visitor,time:Date.now()}));}catch{visitor=crypto.randomUUID();}
let readOnlyPreview=false;
let didTrackVisit=false;
export async function loadMenu(signal){
 if(!liveSlug){const response=await fetch('./menu-data.json',{signal,cache:'no-cache'});if(!response.ok)throw Error('Menu unavailable');return response.json();}
 await db.auth.getSession();
 const menu=await result(db.rpc('get_public_menu',{menu_slug:liveSlug}).abortSignal(signal));
 // Signed-in editors do not inflate guest analytics while previewing their own menus.
 const session=await db.auth.getSession();if(session.data.session){const {data}=await db.from('restaurants').select('id,status').eq('id',menu.restaurant.id).maybeSingle();readOnlyPreview=!!data;menu.restaurant.editorPreview=!!data&&data.status!=='active';}
 menu.items=menu.items.map(i=>({dietary:[],allergens:[],pairsWith:[],moods:[],description:{en:''},ingredients:{en:''},short:{en:''},...i}));
 menu.restaurant.monogram ||=menu.restaurant.name[0];
 return normalizeMenu(menu);
}
export function track(kind,dish=null,language='en'){
 if(embeddedPreview||!liveSlug||readOnlyPreview||navigator.doNotTrack==='1'||globalThis.globalPrivacyControl)return;
 if(kind==='menu_view'){if(didTrackVisit)return;didTrackVisit=true;}
 db.rpc('record_menu_event',{menu_slug:liveSlug,visitor,event_kind:kind,dish,locale:language,referral:new URLSearchParams(location.search).get('source')||'direct'}).then(()=>{}).catch(()=>{});
}
export async function requestRecommendation(mood,filters,language,signal){
 const response=await fetch('https://opxmijpsppojwpogvfwd.supabase.co/functions/v1/recommend',{method:'POST',headers:{'Content-Type':'application/json'},signal,body:JSON.stringify({slug:liveSlug,mood,filters,language})});
 if(!response.ok)throw Error('Recommendations temporarily unavailable');
 return response.json();
}
