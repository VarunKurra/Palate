import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeMenu} from './menu-data.mjs';
test('a new restaurant with no dishes loads as a valid empty menu',()=>{
 const menu=normalizeMenu({restaurant:{name:'New restaurant'},categories:[],items:[]});
 assert.equal(menu.restaurant.name,'New restaurant');assert.deepEqual(menu.items,[]);assert.equal(menu.deal.enabled,false);assert.deepEqual(menu.restaurant.languages,['en']);
});
test('missing restaurant or invalid item collections remain errors',()=>{
 for(const payload of [null,{}, {restaurant:{name:'Cafe'},items:null,categories:[]},{restaurant:{},items:[],categories:null}])assert.throws(()=>normalizeMenu(payload));
});
test('normalizing preserves content and supplies optional lists without mutating the input',()=>{
 const input={restaurant:{name:'Cafe',currency:'EUR',languages:['fr'],theme:{accent:'#123456'}},items:[{id:'soup',name:{fr:'Soupe'},priceCents:850,image:'/soup.jpg'}],categories:[]};
 const before=structuredClone(input);const menu=normalizeMenu(input);
 assert.deepEqual(input,before);assert.equal(menu.items[0].image,'/soup.jpg');assert.equal(menu.items[0].priceCents,850);assert.deepEqual(menu.items[0].allergens,[]);assert.equal(menu.restaurant.currency,'EUR');assert.deepEqual(menu.restaurant.languages,['fr']);
});
