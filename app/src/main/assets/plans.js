/* Mis Cuentas PRO es una aplicación personal: todas las funciones disponibles. */
(function(root){'use strict';
localStorage.removeItem('mcp-preview-plan-1');
function mount(){const menu=document.querySelector('#home>.homeMenu');if(menu)for(const label of ['Mi cuenta','Ajustes']){const tile=[...menu.children].find(x=>x.textContent.trim().endsWith(label));if(tile)menu.append(tile)}document.getElementById('planPanel')?.remove();for(const el of document.querySelectorAll('[data-pro-create]')){el.disabled=false;el.removeAttribute('data-pro-create');el.removeAttribute('title')}}
root.CAPlans={isFree:()=>false,refresh:mount};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})(globalThis);
