import {normalizeMenu} from '../../menu/src/menu-data.mjs';
export function previewMenuData(restaurant,items=[],categories=[],deals=[]){
 const deal=deals.find(d=>d.enabled);
 return normalizeMenu({restaurant:{...restaurant.settings?.restaurant,id:restaurant.id,name:restaurant.name,slug:restaurant.slug,sample:false},categories:categories.map(c=>({id:c.id,name:typeof c.name==='string'?{en:c.name}:c.name})),items:items.map(i=>({...i.data,id:i.id,category:i.category_id,name:{...i.data?.name,en:i.name},priceCents:i.price_cents,available:i.available})),deal:deal?{...deal.data,id:deal.id,enabled:true,name:{...deal.data?.name,en:deal.name},discountCents:deal.discount_cents}:{enabled:false,itemIds:[]},assistant:{mode:'local'}});
}
