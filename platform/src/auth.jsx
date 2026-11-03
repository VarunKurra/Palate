import React,{useState} from 'react';
import {ArrowLeft,ArrowRight,Mail,Pause,Play} from 'lucide-react';
import {db,result} from './client';
import {Brand,Button,Field,ErrorBox} from './ui';
const featuredDishes=[
 {name:'Burrata & tomatoes',image:'burrata.webp'},
 {name:'Chili-crisp dumplings',image:'dumplings.jpg'},
 {name:'Tomato & basil pasta',image:'pasta.jpg'},
 {name:'Lemon & herb chicken',image:'chicken.webp'},
 {name:'Roasted garden bowl',image:'salad.jpg'},
];
function MenuShowcase(){
 const [paused,setPaused]=useState(false);
 return <section className="auth-art"><Brand/><div className="auth-showcase">
  <div className={`auth-food-rail${paused?' is-paused':''}`} aria-label="Sample menu dishes">
   <div className="auth-food-track">{[0,1].map(copy=><div className="auth-food-group" key={copy} aria-hidden={copy===1?true:undefined}>{featuredDishes.map(dish=><figure className="auth-food-card" key={dish.name}><img src={'/menu/assets/'+dish.image} alt="" width="256" height="240" decoding="async"/><figcaption>{dish.name}</figcaption></figure>)}</div>)}</div>
  </div>
  <div className="auth-showcase-caption"><h2>Your menu,<br/>made simple.</h2><button type="button" className="auth-motion-toggle" aria-label={paused?'Play dish carousel':'Pause dish carousel'} onClick={()=>setPaused(!paused)}>{paused?<Play size={17}/>:<Pause size={17}/>}</button></div>
 </div></section>;
}
export default function Auth({mode='login',onSession,returnTo}){
 const [tab,setTab]=useState(mode==='admin'?'login':mode),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[name,setName]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const staff=mode==='admin';
 async function submit(e){e.preventDefault();setBusy(true);setError('');setMessage('');try{
 if(tab==='signup'){const {data,error}=await db.auth.signUp({email,password,options:{data:{full_name:name},emailRedirectTo:location.origin+(returnTo||'/dashboard/')}});if(error)throw error;if(data.session){onSession(data.session);location.href=returnTo||'/dashboard/';}else setMessage('Check your email to confirm your account, then sign in.');}
 else if(tab==='forgot'){await result(db.auth.resetPasswordForEmail(email,{redirectTo:location.origin+'/reset-password/'}));setMessage('If this account exists, a reset link is on its way.');}
 else if(tab==='reset'){await result(db.auth.updateUser({password}));location.href=returnTo||'/dashboard/';}
 else{const {data,error}=await db.auth.signInWithPassword({email,password});if(error)throw error;onSession(data.session);location.href=returnTo||(staff?'/admin/':'/dashboard/');}
 }catch(e){setError(e);}finally{setBusy(false);}}
 return <div className="auth-page"><MenuShowcase/><section className="auth-form-wrap"><a className="back" href="/"><ArrowLeft size={17}/> Back to Palate</a><div className="auth-form"><div className="auth-heading"><h1>{tab==='signup'?'Your menu starts here.':tab==='forgot'?'Reset your password.':tab==='reset'?'Choose a new password.':staff?'Palate staff.':'Welcome back.'}</h1><img className="auth-brand-mark" src="/assets/palate-logo.svg" alt="Palate" width="46" height="46"/></div><p>{tab==='signup'?'Create an account to book your restaurant’s demo.':staff?'Sign in to the Palate workspace.':tab==='forgot'?'We’ll email you a secure reset link.':tab==='reset'?'Use at least 10 characters.':'Sign in to your restaurant dashboard.'}</p><form onSubmit={submit}><ErrorBox error={error} context={tab}/>{message&&<div className="success" role="status"><Mail size={20}/>{message}</div>}{tab==='signup'&&<Field label="Your name" autoComplete="name" required value={name} onChange={e=>setName(e.target.value)}/ >}{tab!=='reset'&&<Field label="Email address" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/ >}{!['forgot'].includes(tab)&&<Field label="Password" type="password" autoComplete={tab==='signup'?'new-password':'current-password'} minLength={tab==='signup'||tab==='reset'?10:undefined} required value={password} onChange={e=>setPassword(e.target.value)}/ >}{tab==='login'&&<button className="text-btn forgot" type="button" onClick={()=>{setTab('forgot');setError('');}}>Forgot password?</button>}<Button busy={busy} type="submit">{tab==='signup'?'Create account':tab==='forgot'?'Send reset link':tab==='reset'?'Save password':'Sign in'}<ArrowRight size={18}/></Button></form>{staff&&<p className="auth-switch">{tab==='forgot'?<button onClick={()=>{setTab('login');setError('');}}>Back to staff sign in</button>:<a href="/login/"><ArrowLeft size={16}/> Restaurant sign in</a>}</p>}{!staff&&<p className="auth-switch">{tab==='login'?<>New to Palate? <button onClick={()=>setTab('signup')}>Create an account</button></>:<button onClick={()=>setTab('login')}>Back to sign in</button>}</p>}<div className="auth-legal"><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a>{!staff&&<a href="/admin/">Staff sign in</a>}</div></div></section></div>
}
