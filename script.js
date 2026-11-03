(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const config = window.PALATE_CONFIG || {};
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  // Media placeholders follow actual loading; copy and controls never wait for assets.
  const mediaTasks = new WeakMap();
  function releaseMedia(root) {
    $$('[data-media-state]', root).forEach(surface => mediaTasks.get(surface)?.cancel());
  }
  function initMedia(root = document) {
    $$('[data-media-state]', root).forEach(surface => {
      if (mediaTasks.has(surface)) return;
      const img = $('img', surface);
      if (!img) return;
      let timer, observer, finished = false;
      const originalAlt = img.alt;
      const stop = () => { clearTimeout(timer); observer?.disconnect(); };
      const finish = status => {
        if (!surface.isConnected) { cancel(); return; }
        stop();
        finished = true;
        surface.dataset.mediaState = status;
        surface.removeAttribute('aria-busy');
        img.alt = status === 'error' ? originalAlt + ' (image unavailable)' : originalAlt;
        const placeholder = $('.media-skeleton', surface);
        if (placeholder) placeholder.textContent = status === 'error' && !surface.classList.contains('hero-media') ? 'Image unavailable' : '';
      };
      const ready = () => {
        if (!img.naturalWidth) return finish('error');
        // Decoding before the reveal prevents a flash of an incomplete image.
        const decoded = img.decode ? img.decode().catch(() => {}) : Promise.resolve();
        decoded.then(() => finish('ready'));
      };
      const failed = () => finish('error');
      const cancel = () => { stop(); img.removeEventListener('load', ready); img.removeEventListener('error', failed); };
      mediaTasks.set(surface, { finish, cancel });
      surface.setAttribute('aria-busy', 'true');
      img.addEventListener('load', ready);
      img.addEventListener('error', failed);
      if (img.complete) { img.naturalWidth ? ready() : failed(); return; }
      const startTimeout = () => { if (!finished) timer = setTimeout(() => finish('error'), 15000); };
      if ('IntersectionObserver' in window) {
        observer = new IntersectionObserver(entries => {
          if (!surface.isConnected) return cancel();
          if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); startTimeout(); }
        }, { rootMargin: '250px' });
        observer.observe(surface);
      } else startTimeout();
    });
  }
  initMedia();
  const state = { language: 'en', filter: 'all', feature: 'photos', pastaAvailable: true, motionPaused: reduceMotion.matches };
  const text = {
    en: { tagline:'Good food. Good company.', title:'Explore the menu', intro:'Choose a dish to see the details.', all:'All dishes', vegan:'Vegan', gf:'Gluten-free', sample:'SAMPLE RESTAURANT', footnote:'Sample dishes · AI food illustrations', powered:'Menu by', favorite:'House favorite', sold:'Sold out today', ingredients:'INGREDIENTS', pair:'PAIRS WELL WITH', illustration:'AI-generated illustration · Sample dish', allergy:'Sample ingredient information. For real menus, always check with restaurant staff about serious allergies.', find:'Find my pairing', pairing:'Something fresh, with a little crunch.', pairingTitle:'A little of everything.', pairingNote:'An example of how Palate could bring a meal together. This homepage uses a prepared sample, not a live AI recommendation.', pairingItems:'Pan-seared dumplings to start, a roasted garden bowl, and a sparkling citrus cooler.', empty:'No sample dishes match this filter.' },
    es: { tagline:'Buena comida. Buena compañía.', title:'Un poco de lo que te gusta.', intro:'Recién hecho. Listo para descubrir.', all:'Todos', vegan:'Vegano', gf:'Sin gluten', sample:'RESTAURANTE DE EJEMPLO', footnote:'Platos de ejemplo · Ilustraciones con IA', powered:'Creado con', favorite:'Favorito de la casa', sold:'Agotado hoy', ingredients:'INGREDIENTES', pair:'COMBINA BIEN CON', illustration:'Ilustración con IA · Plato de ejemplo', allergy:'Información de ingredientes de ejemplo. Consulta siempre al personal sobre alergias graves.', find:'Encuentra mi combinación', pairing:'Algo fresco, con un toque crujiente.', pairingTitle:'Un poco de todo.', pairingNote:'Un ejemplo de cómo Palate podría sugerir una comida. Esta demostración usa una combinación preparada, no una recomendación de IA en tiempo real.', pairingItems:'Dumplings de verduras, un bol de verduras asadas y una bebida cítrica con gas.', empty:'Ningún plato de ejemplo coincide con este filtro.' },
    fr: { tagline:'Bonne cuisine. Bonne compagnie.', title:'Un peu de ce que vous aimez.', intro:'Fait maison. À découvrir.', all:'Tous les plats', vegan:'Végétalien', gf:'Sans gluten', sample:'RESTAURANT FICTIF', footnote:'Plats fictifs · Illustrations par IA', powered:'Créé avec', favorite:'Le favori de la maison', sold:'Épuisé aujourd’hui', ingredients:'INGRÉDIENTS', pair:'À ACCOMPAGNER DE', illustration:'Illustration par IA · Plat fictif', allergy:'Ingrédients donnés à titre d’exemple. Consultez toujours le personnel en cas d’allergies graves.', find:'Trouver mon accord', pairing:'Du frais, avec une touche de croquant.', pairingTitle:'Un peu de tout.', pairingNote:'Un exemple de repas suggéré par Palate. Cette démonstration utilise un accord préparé, sans recommandation IA en direct.', pairingItems:'Des raviolis aux légumes, un bol de légumes rôtis et une boisson pétillante aux agrumes.', empty:'Aucun plat fictif ne correspond à ce filtre.' }
  };
  const dishes = [
    {id:'pasta',price:18,tags:[],image:'pasta',en:{name:'Tomato & basil rigatoni',short:'Slow-roasted tomatoes, basil, parmesan.',description:'Comfort in a bowl. Rigatoni tossed in a slow-roasted tomato sauce, finished with fresh basil and grated parmesan.',ingredients:'Wheat pasta, tomatoes, basil, parmesan (milk), olive oil, garlic.',pairing:'A crisp side salad + a sparkling citrus cooler'},es:{name:'Rigatoni con tomate y albahaca',short:'Tomates asados, albahaca y parmesano.',description:'Rigatoni con salsa de tomate asado, albahaca fresca y parmesano rallado.',ingredients:'Pasta de trigo, tomates, albahaca, parmesano (leche), aceite de oliva y ajo.',pairing:'Ensalada fresca y bebida cítrica con gas'},fr:{name:'Rigatoni tomate et basilic',short:'Tomates rôties, basilic et parmesan.',description:'Rigatoni à la sauce de tomates rôties, basilic frais et parmesan râpé.',ingredients:'Pâtes de blé, tomates, basilic, parmesan (lait), huile d’olive et ail.',pairing:'Une salade croquante et une boisson pétillante aux agrumes'}},
    {id:'dumplings',price:10,tags:['vegan'],image:'dumplings',en:{name:'Pan-seared dumplings',short:'Golden, crisp, and packed with vegetables.',description:'Delicate vegetable dumplings with golden, pan-seared bottoms. Served with scallions and a savory soy dipping sauce.',ingredients:'Wheat wrappers, cabbage, mushrooms, carrot, scallions, soy sauce (soy, wheat), sesame oil.',pairing:'A roasted garden bowl + jasmine iced tea'},es:{name:'Dumplings de verduras',short:'Dorados, crujientes y llenos de verduras.',description:'Dumplings de verduras dorados a la plancha, servidos con cebolleta y salsa de soja.',ingredients:'Masa de trigo, col, champiñones, zanahoria, cebolleta, salsa de soja (soja, trigo) y aceite de sésamo.',pairing:'Bol de verduras asadas y té de jazmín frío'},fr:{name:'Raviolis aux légumes grillés',short:'Dorés, croustillants et riches en légumes.',description:'Raviolis aux légumes dorés à la poêle, servis avec des oignons verts et une sauce soja.',ingredients:'Pâte de blé, chou, champignons, carotte, oignons verts, sauce soja (soja, blé) et huile de sésame.',pairing:'Un bol de légumes rôtis et un thé glacé au jasmin'}},
    {id:'salad',price:15,tags:['vegan','gluten-free'],image:'salad',en:{name:'Roasted garden bowl',short:'Seasonal vegetables, citrus, fresh herbs.',description:'Roasted beets and sweet potato meet chickpeas, crisp greens, bright citrus, and fresh herbs. Finished with sesame and a lemon dressing.',ingredients:'Beets, sweet potato, chickpeas, citrus, salad greens, sesame, parsley, mint, lemon, olive oil.',pairing:'Roasted seasonal vegetables + a sparkling citrus cooler'},es:{name:'Bol de verduras asadas',short:'Verduras de temporada, cítricos y hierbas.',description:'Remolacha y boniato asados con garbanzos, hojas verdes, cítricos, hierbas frescas y sésamo.',ingredients:'Remolacha, boniato, garbanzos, cítricos, hojas verdes, sésamo, perejil, menta, limón y aceite de oliva.',pairing:'Verduras de temporada asadas y bebida cítrica con gas'},fr:{name:'Bol de légumes rôtis',short:'Légumes de saison, agrumes et herbes.',description:'Betteraves et patates douces rôties, pois chiches, salade croquante, agrumes, herbes fraîches et sésame.',ingredients:'Betteraves, patates douces, pois chiches, agrumes, salade, sésame, persil, menthe, citron et huile d’olive.',pairing:'Des légumes de saison rôtis et une boisson pétillante aux agrumes'}}
  ];
  function escapeHTML(value) { const el = document.createElement('span'); el.textContent = value; return el.innerHTML; }
  function price(n) { return new Intl.NumberFormat(state.language, { style:'currency', currency:'USD', maximumFractionDigits:0 }).format(n); }
  function renderMenu() {
    const t=text[state.language];
    $('.phone-content').lang=state.language;
    $('#restaurant-tagline').textContent=t.tagline; $('#menu-title').textContent=t.title; $('#menu-intro').textContent=t.intro;
    $('.sample-label').textContent=t.sample; $('.phone-footnote').textContent=t.footnote;
    $('.phone-powered').innerHTML=`${t.powered} <strong>palate.</strong>`;
    $('[data-filter="all"]').textContent=t.all; $('[data-filter="vegan"]').textContent=t.vegan; $('[data-filter="gluten-free"]').textContent=t.gf;
    $('#pairing-intro').textContent=t.pairing; $('#sample-pairing').innerHTML=`${t.find} <span aria-hidden="true">→</span>`;
    $$('.menu-filters button').forEach(b=>{const selected=b.dataset.filter===state.filter;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));});
    const visible=dishes.filter(d=>state.filter==='all'||d.tags.includes(state.filter));
    releaseMedia($('#dish-list'));
    $('#dish-list').innerHTML=visible.map(d=>{const copy=d[state.language];const sold=d.id==='pasta'&&!state.pastaAvailable;return `<button data-media-state="loading" class="media-surface menu-dish ${sold?'sold-out':''}" data-dish="${d.id}" aria-label="${escapeHTML(copy.name)} — ${price(d.price)}${sold?' — '+t.sold:''}"><img src="assets/${d.image}.jpg" alt="${escapeHTML(copy.name)} — ${t.illustration}" loading="lazy"><span class="media-skeleton" aria-hidden="true"></span><span class="dish-badge">${sold?t.sold:d.tags.includes('vegan')?t.vegan:t.favorite}</span><span class="menu-dish-content"><span class="dish-title-row"><span>${copy.name}</span><span>${price(d.price)}</span></span><span class="dish-short">${copy.short}</span></span></button>`;}).join('')||`<p class="empty-dishes">${t.empty}</p>`;
    initMedia($('#dish-list'));
    $$('.menu-dish').forEach(button=>button.addEventListener('click',()=>openDish(button.dataset.dish)));
  }
  function openDish(id){
    const d=dishes.find(x=>x.id===id),copy=d[state.language],t=text[state.language];
    releaseMedia($('#dish-detail'));
    $('#dish-detail').innerHTML=`<div class="detail-media media-surface" data-media-state="loading"><span class="media-skeleton" aria-hidden="true"></span><img class="dish-detail-image" src="assets/${d.image}.jpg" alt="${escapeHTML(copy.name)} — ${t.illustration}"></div><div class="dish-detail-content" lang="${state.language}"><div class="eyebrow">${t.illustration}</div><h2 id="dish-dialog-title">${copy.name}</h2><div class="dish-detail-price">${price(d.price)}${d.id==='pasta'&&!state.pastaAvailable?' · '+t.sold:''}</div><div class="detail-tags">${d.tags.map(tag=>`<span>${tag==='vegan'?t.vegan:t.gf}</span>`).join('')}</div><p>${copy.description}</p><div class="detail-heading">${t.ingredients}</div><p>${copy.ingredients}</p><div class="detail-pairing"><span>${t.pair}</span>${copy.pairing}</div><p class="allergy-note">${t.allergy}</p></div>`;
    showDialog($('#dish-dialog'));
  }
  const featureNotes={photos:['A little more clarity.','A lot more appetite.'],filters:['Their preferences, sorted.','One tap to find their favorite.'],pairings:['A meal that makes sense.','A starter. A main. A little extra.'],languages:['A warm welcome, in any language.','Try English, Spanish, or French.']};
  function selectFeature(feature){
    state.feature=feature;
    $$('.feature-tab').forEach(b=>{const active=b.dataset.feature===feature;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;$('.tab-plus',b).textContent=active?'−':'+';});
    $('#product-demo').setAttribute('aria-labelledby','tab-'+feature);
    $('#pairing-inline').hidden=feature!=='pairings';
    state.filter=feature==='filters'?'vegan':'all';
    if(feature==='languages'&&state.language==='en'){state.language='es';$('#language').value='es';}
    renderMenu();$('.phone-content').scrollTop=0;
    if(!reduceMotion.matches){const content=$('.phone-content');content.getAnimations().forEach(a=>a.cancel());content.animate([{opacity:.4,transform:'translateY(7px)'},{opacity:1,transform:'translateY(0)'}],{duration:350,easing:'cubic-bezier(.22,1,.36,1)'});}
  }
  $$('.feature-tab').forEach((tab,i,tabs)=>{
    tab.addEventListener('click',()=>selectFeature(tab.dataset.feature));
    tab.addEventListener('keydown',e=>{let target;if(['ArrowDown','ArrowRight'].includes(e.key))target=(i+1)%tabs.length;if(['ArrowUp','ArrowLeft'].includes(e.key))target=(i-1+tabs.length)%tabs.length;if(e.key==='Home')target=0;if(e.key==='End')target=tabs.length-1;if(target!==undefined){e.preventDefault();tabs[target].focus();selectFeature(tabs[target].dataset.feature);}});
  });
  $$('.menu-filters button').forEach(b=>b.addEventListener('click',()=>{state.filter=b.dataset.filter;renderMenu();}));
  $('#language').addEventListener('change',e=>{state.language=e.target.value;renderMenu();});
  $('#sample-pairing').addEventListener('click',()=>{const t=text[state.language];releaseMedia($('#dish-detail'));$('#dish-detail').innerHTML=`<div class="detail-media media-surface" data-media-state="loading"><span class="media-skeleton" aria-hidden="true"></span><img class="dish-detail-image" src="assets/salad.jpg" alt="${t.illustration}"></div><div class="dish-detail-content" lang="${state.language}"><div class="eyebrow">${state.language==='en'?'SAMPLE PAIRING':state.language==='es'?'COMBINACIÓN DE EJEMPLO':'ACCORD DONNÉ À TITRE D’EXEMPLE'}</div><h2 id="dish-dialog-title">${t.pairingTitle}</h2><p>${t.pairingItems}</p><div class="detail-pairing">${t.pairingNote}</div><p class="allergy-note">${t.allergy}</p></div>`;showDialog($('#dish-dialog'));});
  $('#availability').addEventListener('click',()=>{
    state.pastaAvailable=!state.pastaAvailable;
    $('#availability').setAttribute('aria-checked',String(state.pastaAvailable));
    $('#dashboard-status').innerHTML=state.pastaAvailable?'<span>✓</span> All dishes available on your sample menu':'<span>✓</span> Rigatoni marked sold out on your sample menu';
    $('#guest-status').textContent=state.pastaAvailable?'Rigatoni is on the menu.':'Rigatoni is sold out today.';
    renderMenu();
  });
  let lastFocus=null;
  function showDialog(dialog){initMedia(dialog);lastFocus=document.activeElement;dialog.showModal();document.body.style.overflow='hidden';}
  $$('dialog').forEach(d=>{
    $('.dialog-close',d).addEventListener('click',()=>d.close());
    d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});
    d.addEventListener('close',()=>{document.body.style.overflow='';if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});});
  });
  function safeBookingUrl(value){try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)?url.href:'';}catch{return '';}}
  $$('[data-start]').forEach(b=>b.addEventListener('click',()=>{window.location.href='/signup/';}));
  let requestBlobUrl='';
  $('#demo-form').addEventListener('submit',e=>{
    e.preventDefault();const data=new FormData(e.currentTarget);const name=String(data.get('name')).trim(),restaurant=String(data.get('restaurant')).trim(),email=String(data.get('email')).trim(),website=String(data.get('website')).trim();
    if(!name||!restaurant){$('#form-note').textContent='Please add your name and restaurant name.';return;}
    const request=`Palate demo request\n\nName: ${name}\nRestaurant: ${restaurant}\nEmail: ${email}\nMenu / website: ${website||'Not provided'}\n\nI’d like to see how Palate could bring our menu to life.\n\nPlan: $200 one-time setup + $20/month per menu.\nThis is a demo inquiry, not an order or payment commitment.\n`;
    if(config.contactEmail){window.location.href=`mailto:${encodeURIComponent(config.contactEmail)}?subject=${encodeURIComponent('Palate demo — '+restaurant)}&body=${encodeURIComponent(request)}`;return;}
    if(requestBlobUrl)URL.revokeObjectURL(requestBlobUrl);
    requestBlobUrl=URL.createObjectURL(new Blob([request],{type:'text/plain;charset=utf-8'}));
    $('#download-request').href=requestBlobUrl;
    $('#result-copy').textContent=`Your request for ${restaurant} is ready to save. Nothing has been sent or booked.`;
    $('#demo-form').hidden=true;$('#form-result').hidden=false;$('#start-intro').hidden=true;$('#download-request').focus();
  });
  $('#back-form').addEventListener('click',()=>{$('#demo-form').hidden=false;$('#form-result').hidden=true;$('#start-intro').hidden=false;$('input[name=name]').focus();});
  $('#image-info').addEventListener('click',()=>showDialog($('#info-dialog')));
  const navToggle=$('.menu-toggle');
  function closeNav(){navToggle.setAttribute('aria-expanded','false');navToggle.setAttribute('aria-label','Open navigation');$('#mobile-nav').hidden=true;$('#header').classList.remove('menu-open');}
  navToggle.addEventListener('click',()=>{const open=navToggle.getAttribute('aria-expanded')!=='true';navToggle.setAttribute('aria-expanded',String(open));navToggle.setAttribute('aria-label',open?'Close navigation':'Open navigation');$('#mobile-nav').hidden=!open;$('#header').classList.toggle('menu-open',open);});
  $$('#mobile-nav a').forEach(a=>a.addEventListener('click',closeNav));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&navToggle.getAttribute('aria-expanded')==='true'){closeNav();navToggle.focus();}});
  const updateHeader=()=>$('#header').classList.toggle('scrolled',window.scrollY>35);
  window.addEventListener('scroll',updateHeader,{passive:true});updateHeader();
  const video=$('#hero-video');
  function updateMotion(){
    $('.hero').classList.toggle('motion-paused',state.motionPaused);document.body.classList.toggle('motion-paused',state.motionPaused);
    window.dispatchEvent(new Event('palate:motion-change'));
    $('#motion-toggle').setAttribute('aria-pressed',String(state.motionPaused));$('#motion-toggle').setAttribute('aria-label',state.motionPaused?'Play background motion':'Pause background motion');$('#motion-icon').textContent=state.motionPaused?'▷':'Ⅱ';
    if(config.heroVideo && video.readyState>=2){
      if(state.motionPaused || document.hidden){video.pause();}
      else {
        video.play().then(()=>{video.hidden=false;$('.hero-image').hidden=true;mediaTasks.get($('.hero-media'))?.finish('ready');}).catch(()=>{video.hidden=true;$('.hero-image').hidden=false;});
      }
    }
  }
  if(config.heroVideo){
    $('.hero-image').style.animation='none';
    video.muted=true;video.defaultMuted=true;video.autoplay=!state.motionPaused;video.loop=true;video.playsInline=true;
    video.addEventListener('canplay',updateMotion);
    video.addEventListener('error',()=>{video.hidden=true;$('.hero-image').hidden=false;});
    video.preload=reduceMotion.matches?'metadata':'auto';video.src=config.heroVideo;video.load();
    $('#motion-info').textContent='The background is an original AI-generated restaurant video created with Kling inside Adobe Firefly. Dish images are AI-generated illustrations.';
  }
  $('#motion-toggle').addEventListener('click',()=>{state.motionPaused=!state.motionPaused;updateMotion();});
  reduceMotion.addEventListener('change',e=>{state.motionPaused=e.matches;updateMotion();});updateMotion();
  document.addEventListener('visibilitychange',updateMotion);
  const dropdowns=$$('.nav-dropdown');
  function closeDropdowns(except){dropdowns.forEach(d=>{if(d!==except){$('button',d).setAttribute('aria-expanded','false');$('.nav-dropdown-panel',d).hidden=true;}});}
  dropdowns.forEach(d=>{const trigger=$('button',d),panel=$('.nav-dropdown-panel',d);trigger.addEventListener('click',()=>{const open=trigger.getAttribute('aria-expanded')!=='true';closeDropdowns(d);trigger.setAttribute('aria-expanded',String(open));panel.hidden=!open;});$$('a',d).forEach(a=>a.addEventListener('click',()=>{if(a.dataset.navFeature)selectFeature(a.dataset.navFeature);closeDropdowns();}));});
  document.addEventListener('click',e=>{if(!e.target.closest('.nav-dropdown'))closeDropdowns();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){const d=dropdowns.find(d=>$('button',d).getAttribute('aria-expanded')==='true');closeDropdowns();if(d)$('button',d).focus();}});
  $$('[data-login]').forEach(b=>b.addEventListener('click',()=>{window.location.href='/login/';}));
  $('#view-owner-demo').addEventListener('click',()=>{$('#login-dialog').close();$('#for-owners').scrollIntoView({behavior:reduceMotion.matches?'instant':'smooth'});});
  // Animate FAQ height without moving the rest of the page abruptly.
  $$('.faq-list details').forEach(details=>{
    const summary=$('summary',details);let animation;
    summary.addEventListener('click',e=>{
      if(reduceMotion.matches)return;
      e.preventDefault();animation?.cancel();
      const open=!details.open,start=details.offsetHeight;
      if(open)details.open=true;
      const end=open?details.scrollHeight:summary.offsetHeight;
      details.style.overflow='hidden';
      animation=details.animate({height:[start+'px',end+'px']},{duration:300,easing:'cubic-bezier(.22,1,.36,1)'});
      animation.onfinish=()=>{details.open=open;details.style.overflow='';animation=null;};
    });
  });

  renderMenu();
})();
