export const slugify=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70);
export function cents(value){const n=Number(value);if(!Number.isFinite(n)||n<0||n>100000)throw Error('Enter a price between 0 and 100,000.');return Math.round(n*100);}
export function safeUrl(value){if(!value)return '';try{const url=new URL(value,typeof location==='undefined'?'https://palate.example':location.origin);return ['https:','http:'].includes(url.protocol)?url.href:'';}catch{return '';}}
export const emptyItem=(category)=>({category_id:category,name:'',price_cents:0,available:true,position:0,data:{name:{en:''},short:{en:''},description:{en:''},ingredients:{en:''},dietary:[],allergens:[],pairsWith:[],moods:[],image:'',imageKind:'photo',course:'mains'}});
export function itemPayload(form,restaurantId){if(!form.name?.trim())throw Error('Give this dish a name.');if(!form.category_id)throw Error('Choose a category.');return {...form,restaurant_id:restaurantId,name:form.name.trim(),data:{...form.data,name:{...form.data.name,en:form.name.trim()}}};}
export const money=(n,currency='USD')=>new Intl.NumberFormat('en',{style:'currency',currency,maximumFractionDigits:2}).format((n||0)/100);
export function engagement(t){return t?.visits?Math.min(100,Math.round(t.engaged/t.visits*100)):0;}
export {friendlyError as normalizeError} from './errors.mjs';
export function csvCell(v){const s=String(v??'');return '"'+(/^[=+@\-\t\r]/.test(s)?"'":"")+s.replaceAll('"','""')+'"';}
