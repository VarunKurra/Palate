const key='palate-pending-invitation';
export function rememberInvitation(location,storage){
  const candidate=new URLSearchParams(location.hash.slice(1)).get('invite');
  if(candidate!==null){
    if(/^[a-f0-9]{64}$/.test(candidate))storage.setItem(key,candidate);
    else storage.removeItem(key);
  }
  return storage.getItem(key)||'';
}
export function forgetInvitation(storage){storage.removeItem(key);}
export function invitationLink(origin,token){
  if(!/^[a-f0-9]{64}$/.test(token))throw Error('Invitation unavailable');
  return `${origin}/invite/#invite=${token}`;
}
