import React from 'react';
import * as Select from '@radix-ui/react-select';
import {Check,ChevronDown,ChevronUp} from 'lucide-react';

function Avatar({restaurant}){
 const logo=restaurant?.settings?.restaurant?.logo;
 return <span className="switcher-avatar" aria-hidden="true">{logo?<img src={logo} alt=""/>:restaurant?.name?.[0]||'P'}</span>;
}

export default function RestaurantSwitcher({restaurants,value,onChange}){
 const current=restaurants.find(r=>r.id===value);
 return <Select.Root value={current?.id||''} onValueChange={onChange} disabled={!restaurants.length}>
  <Select.Trigger className="restaurant-switcher" aria-label="Choose restaurant">
   <Avatar restaurant={current}/>
   <span className="switcher-name"><Select.Value placeholder="Your restaurant">{current?.name}</Select.Value></span>
   <Select.Icon className="switcher-chevron"><ChevronDown size={16}/></Select.Icon>
  </Select.Trigger>
  <Select.Portal><Select.Content className="restaurant-switcher-menu" position="popper" sideOffset={8} align="start" collisionPadding={12}>
   <Select.ScrollUpButton className="switcher-scroll"><ChevronUp size={16}/></Select.ScrollUpButton>
   <Select.Viewport><Select.Group><Select.Label className="switcher-label">Your restaurants</Select.Label>
    {restaurants.map(r=><Select.Item className="restaurant-option" key={r.id} value={r.id} textValue={r.name}>
     <Avatar restaurant={r}/><Select.ItemText>{r.name}</Select.ItemText><Select.ItemIndicator className="switcher-check"><Check size={17}/></Select.ItemIndicator>
    </Select.Item>)}
   </Select.Group></Select.Viewport>
   <Select.ScrollDownButton className="switcher-scroll"><ChevronDown size={16}/></Select.ScrollDownButton>
  </Select.Content></Select.Portal>
 </Select.Root>;
}
