import React,{useState,useEffect} from 'react';
import {ArrowRight} from 'lucide-react';
import Auth from './auth';
import {db,result} from './client';
import {Brand,Button,ErrorBox} from './ui';
import {rememberInvitation,forgetInvitation} from './invitation.mjs';

function readInvitation(){
  const value=rememberInvitation(location,sessionStorage);
  if(location.hash.startsWith('#invite='))history.replaceState(null,'',location.pathname);
  return value;
}
export default function Invite({session,onSession}){
 const [token,setToken]=useState(readInvitation);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{
  const update=()=>{setToken(readInvitation());setError('');};
  window.addEventListener('hashchange',update);
  return()=>window.removeEventListener('hashchange',update);
 },[]);
 if(!token)return <main className="access-denied"><Brand/><h1>Open your invitation link.</h1><p>Ask your restaurant owner or Palate team for a new link.</p><a className="btn secondary" href="/login/">Back to sign in</a></main>;
 if(!session)return <Auth onSession={onSession} returnTo="/invite/"/>;
 async function accept(){
  setBusy(true);setError('');
  try{
   const access=await result(db.rpc('accept_invitation',{invite_token:token}));
   forgetInvitation(sessionStorage);
   if(access.restaurant_id)sessionStorage.setItem('palate-restaurant',access.restaurant_id);
   location.replace(access.destination==='/admin/'?'/admin/':'/dashboard/');
  }catch(e){setError(e);}finally{setBusy(false);}
 }
 return <main className="access-denied"><Brand/><h1>Your workspace is ready.</h1><p>Accept your invitation as <strong>{session.user.email}</strong>.</p><ErrorBox error={error}/><Button busy={busy} onClick={accept}>Accept invitation<ArrowRight size={18}/></Button><Button variant="secondary" onClick={async()=>{await db.auth.signOut();onSession(null);}}>Use a different account</Button></main>;
}
