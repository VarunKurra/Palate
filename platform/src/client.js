import {createClient} from '@supabase/supabase-js';
export const SUPABASE_URL='https://opxmijpsppojwpogvfwd.supabase.co';
export const SUPABASE_KEY='sb_publishable_sVUKILEIdbvOXWR9QrEUMg_xhlMDphB';
export const db=createClient(SUPABASE_URL,SUPABASE_KEY);
export async function result(query){const {data,error}=await query;if(error)throw error;return data;}
export const SUPPORT='varunbkurra@gmail.com';
export const publicMenu=(r,source='website')=>r.preview?`${location.origin}/menu/`:`${location.origin}/menu/?shop=${encodeURIComponent(r.slug)}&source=${source}`;
export async function uploadImage(restaurantId,file){
 if(!['image/jpeg','image/png','image/webp','image/avif'].includes(file.type))throw Error('Choose a JPG, PNG, WebP, or AVIF image.');
 if(file.size>10*1024*1024)throw Error('Choose an image smaller than 10 MB.');
 const path=`${restaurantId}/${crypto.randomUUID()}.${file.type.split('/')[1]}`;
 await result(db.storage.from('menu-media').upload(path,file,{contentType:file.type,upsert:false}));
 return db.storage.from('menu-media').getPublicUrl(path).data.publicUrl;
}
