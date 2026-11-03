export function normalizeMenu(menu){
 if(!menu?.restaurant||!Array.isArray(menu.items)||!Array.isArray(menu.categories))throw Error('Invalid menu');
 const restaurant={currency:'USD',defaultLanguage:'en',languages:['en'],theme:{},palateUrl:'/',...menu.restaurant};
 restaurant.languages=Array.isArray(restaurant.languages)&&restaurant.languages.length?restaurant.languages:['en'];
 restaurant.monogram ||= (restaurant.name||'Menu')[0];
 return {...menu,restaurant,items:menu.items.map(item=>({dietary:[],allergens:[],pairsWith:[],moods:[],description:{en:''},ingredients:{en:''},short:{en:''},...item})),deal:{enabled:false,itemIds:[],...menu.deal}};
}
