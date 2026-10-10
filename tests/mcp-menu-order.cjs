const a=require('node:assert/strict'),h=require('./helpers/app-dom.cjs')(),{w}=h;
const menu=w.document.querySelector('#home>.homeMenu');
const labels=()=>[...menu.children].map(x=>x.textContent.trim().replace(/^[^A-Za-zÁÉÍÓÚÑ]+/u,''));
const expected=['Agenda','TPV','Movimientos','Caja / Banco','Informes','Cobros pendientes','Empleados','Mi cuenta','Ajustes'];
a.deepEqual(labels(),expected);const nodes=[...menu.children],handlers=nodes.map(n=>n.onclick);w.CAPlans.refresh();a.deepEqual(labels(),expected);a.equal(menu.children.length,9);nodes.forEach((n,i)=>{a.equal(menu.children[i],n);a.equal(n.onclick,handlers[i])});a.equal(w.CAPlans.isFree(),false);console.log('OK Orden de nueve botones, sin duplicados y acciones conservadas');w.close();process.exit(0);
