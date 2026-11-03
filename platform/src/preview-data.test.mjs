import test from 'node:test';
import assert from 'node:assert/strict';
import {previewMenuData} from './preview-data.mjs';
test('an unsaved restaurant can be previewed without dishes or a featured deal',()=>{
 const menu=previewMenuData({id:'new',name:'Cafe',slug:'cafe',settings:{restaurant:{theme:{paper:'#fafafa'}}}});
 assert.equal(menu.restaurant.name,'Cafe');assert.equal(menu.restaurant.theme.paper,'#fafafa');assert.deepEqual(menu.items,[]);assert.equal(menu.deal.enabled,false);
});
test('guest preview uses current edited names, images, prices and availability',()=>{
 const menu=previewMenuData({id:'cafe',name:'Edited name'},[{id:'a',category_id:'mains',name:'Fresh pasta',price_cents:1450,available:false,data:{name:{en:'Old name',fr:'Pâtes'},image:'/pasta.jpg',allergens:['wheat']}}],[{id:'mains',name:'Mains'}],[{id:'bundle',enabled:true,name:'Lunch',discount_cents:200,data:{itemIds:['a','b']}}]);
 assert.equal(menu.items[0].name.en,'Fresh pasta');assert.equal(menu.items[0].name.fr,'Pâtes');assert.equal(menu.items[0].priceCents,1450);assert.equal(menu.items[0].available,false);assert.equal(menu.items[0].image,'/pasta.jpg');assert.deepEqual(menu.categories[0].name,{en:'Mains'});assert.equal(menu.deal.discountCents,200);assert.deepEqual(menu.deal.itemIds,['a','b']);
});
