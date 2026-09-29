import React, { Children, isValidElement, useState } from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup, SelectLabel } from './select';

/** Shared themed dropdown for forms formerly using browser-native options. */
export function StyledSelect({value,defaultValue,onChange,children,name,required,disabled,className,...props}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const [internal,setInternal]=useState(String(defaultValue??''));
  const current=value===undefined?internal:String(value);
  const empty='__select_empty_value__';
  function options(nodes:React.ReactNode):React.ReactNode {
    return Children.toArray(nodes).map((node,i)=>{
      if(!isValidElement<any>(node))return null;
      if(node.type===React.Fragment)return <React.Fragment key={node.key??i}>{options(node.props.children)}</React.Fragment>;
      if(node.type==='optgroup')return <SelectGroup key={node.key??i}><SelectLabel>{node.props.label}</SelectLabel>{options(node.props.children)}</SelectGroup>;
      if(node.type!=='option')return null;
      const option=String(node.props.value??node.props.children);
      return <SelectItem key={node.key??option} value={option||empty} disabled={node.props.disabled}>{node.props.children}</SelectItem>;
    });
  }
  return <Select value={current||empty} name={name} required={required} disabled={disabled} onValueChange={v=>{
    const next=v===empty?'':v;setInternal(next);
    onChange?.({target:{value:next,name},currentTarget:{value:next,name}} as React.ChangeEvent<HTMLSelectElement>);
  }}><SelectTrigger {...props as React.ComponentProps<typeof SelectTrigger>} className={className}><SelectValue/></SelectTrigger><SelectContent>{options(children)}</SelectContent></Select>;
}
