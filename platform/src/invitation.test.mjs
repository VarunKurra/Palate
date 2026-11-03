import test from 'node:test';
import assert from 'node:assert/strict';
import {rememberInvitation,forgetInvitation,invitationLink} from './invitation.mjs';
const token='a'.repeat(64);
const storage=()=>{const map=new Map();return {getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};};
test('invitation survives sign-in navigation and is removed after acceptance',()=>{
 const s=storage();assert.equal(rememberInvitation({hash:'#invite='+token},s),token);
 assert.equal(rememberInvitation({hash:''},s),token);
 forgetInvitation(s);assert.equal(rememberInvitation({hash:''},s),'');
});
test('untrusted or malformed invitation links cannot become navigation targets',()=>{
 assert.equal(rememberInvitation({hash:'#invite=javascript:alert(1)'},storage()),'');
 assert.throws(()=>invitationLink('https://palate.example','../admin'));
 const url=new URL(invitationLink('https://palate.example',token));
 assert.equal(url.pathname,'/invite/');assert.equal(url.search,'');assert.equal(url.hash,'#invite='+token);
 const s=storage();rememberInvitation({hash:'#invite='+token},s);
 assert.equal(rememberInvitation({hash:'#invite=invalid'},s),'');
});
