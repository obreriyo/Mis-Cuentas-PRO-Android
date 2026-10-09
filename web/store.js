/* Local persistence is authoritative while offline. No Firebase cache contains accounts. */
(function(root){
 'use strict';
 const LEGACY='mis_cuentas_pro_web_v1';
 const empty=()=>({movements:[],bank:[],settings:{owner:'',irpf:20},nonworking:[],gestIncome:{}});
 function validate(value){
  const d=JSON.parse(JSON.stringify(value));
  if(!d||!Array.isArray(d.movements)||!Array.isArray(d.bank)||!d.settings||typeof d.settings.owner!=='string'||!Number.isFinite(d.settings.irpf)||d.settings.irpf<0||d.settings.irpf>100)throw Error('Copia no válida');
  d.nonworking=d.nonworking||[];d.gestIncome=d.gestIncome||{};
  const date=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&!isNaN(new Date(x+'T12:00:00Z'))&&new Date(x+'T12:00:00Z').toISOString().slice(0,10)===x;
  if(!Array.isArray(d.nonworking)||!d.nonworking.every(date)||typeof d.gestIncome!=='object'||Array.isArray(d.gestIncome))throw Error('Fechas no válidas');
  const moveIds=new Set(),bankIds=new Set();
  for(const m of d.movements){
   if(moveIds.has(m.id))throw Error("Identificador de movimiento repetido");moveIds.add(m.id);
   if(!Number.isSafeInteger(m.id)||!date(m.date)||!['Ingreso','Gasto'].includes(m.type)||typeof m.concept!=='string'||!Number.isFinite(m.total)||!Number.isFinite(m.vat)||m.vat<0||m.vat>100)throw Error('Movimiento no válido');
   if(m.accounting!=null&&(!Number.isFinite(m.accounting)||Math.abs(m.accounting)>1e9))throw Error('Importe contable no válido');
   if(m.withholding!=null&&(!Number.isFinite(m.withholding)||m.withholding<0||m.withholding>100))throw Error('Importe no válido');
   if(m.paymentMethod!=null&&!['cash','card','transfer','unspecified'].includes(m.paymentMethod))throw Error('Forma de cobro no válida');
  }
  for(const b of d.bank){if(!Number.isSafeInteger(b.id)||bankIds.has(b.id)||!date(b.date)||!Number.isFinite(b.amount))throw Error('Banco no válido');bankIds.add(b.id)}
  d.employees=d.employees||[];d.payrolls=d.payrolls||[];d.vacations=d.vacations||[];
  const positive=n=>Number.isFinite(n)&&n>=0;
  const uid=n=>typeof n==='string'&&n.length>0&&n.length<100&&/^[-A-Za-z0-9_]+$/.test(n);
  if(!Array.isArray(d.employees)||!Array.isArray(d.payrolls)||!Array.isArray(d.vacations))throw Error('Empleados no válidos');
  const ids=new Set();for(const e of d.employees){if(!uid(e.id)||ids.has(e.id)||typeof e.name!=='string'||!e.name.trim()||!positive(e.allowance)||!['working','calendar'].includes(e.basis)||!Number.isInteger(e.year))throw Error('Empleado no válido');if(e.quotas!=null&&(typeof e.quotas!=='object'||Array.isArray(e.quotas)||!Object.entries(e.quotas).every(([y,n])=>/^\d{4}$/.test(y)&&positive(n))))throw Error('Cupo no válido');ids.add(e.id)}
  const costs=new Set();for(const p of d.payrolls){if(!uid(p.id)||costs.has(p.id)||!ids.has(p.employeeId)||!date(p.date)||!positive(p.salary)||!positive(p.social)||!positive(p.other)||!Number.isSafeInteger(p.movementId))throw Error('Coste de empleado no válido');costs.add(p.id);const m=d.movements.find(m=>m.id===p.movementId);if(!m||m.type!=='Gasto'||m.payrollId!==p.id||Math.abs(m.total-p.salary-p.social-p.other)>0.011)throw Error('Nómina sin gasto vinculado')}
  for(const m of d.movements)if(m.payrollId!=null&&!costs.has(m.payrollId))throw Error('Gasto de empleado sin nómina');
  const vacationIds=new Set();for(const v of d.vacations){if(vacationIds.has(v.id))throw Error("Vacaciones repetidas");vacationIds.add(v.id);if(!uid(v.id)||!ids.has(v.employeeId)||!date(v.start)||!date(v.end)||v.end<v.start||v.start.slice(0,4)!==v.end.slice(0,4)||!positive(v.days)||v.days===0||!['planned','taken'].includes(v.status))throw Error('Vacaciones no válidas')}
  d.receivables=d.receivables||[];
  if(!Array.isArray(d.receivables))throw Error('Cobros pendientes no válidos');
  const realDate=s=>date(s)&&!isNaN(new Date(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
  const dueIds=new Set();for(const r of d.receivables){if(!uid(r.id)||!/^[-A-Za-z0-9_]+$/.test(r.id)||dueIds.has(r.id)||typeof r.client!=='string'||!r.client.trim()||r.client.length>120||typeof r.concept!=='string'||!r.concept.trim()||r.concept.length>240||!realDate(r.date)||!realDate(r.due)||r.due<r.date||!positive(r.total)||r.total===0||!positive(r.vat)||r.vat>100||!['pending','paid'].includes(r.status)||(r.reference!=null&&(typeof r.reference!=='string'||r.reference.length>80)))throw Error('Cobro pendiente no válido');dueIds.add(r.id);if(r.status==='paid'){const m=d.movements.find(m=>m.id===r.movementId);if(!m||m.type!=='Ingreso'||m.receivableId!==r.id||m.date!==r.paidDate||Math.abs(m.total-r.total)>0.011||m.vat!==r.vat||!realDate(r.paidDate)||r.paidDate<r.date)throw Error('Cobro sin ingreso vinculado')}else if(r.movementId!=null||r.paidDate!=null)throw Error('Pendiente con ingreso vinculado')}
  for(const m of d.movements)if(m.receivableId!=null&&!d.receivables.some(r=>r.id===m.receivableId&&r.status==='paid'&&r.movementId===m.id))throw Error('Ingreso con vínculo no válido');
  const b=d.settings.branding;if(b!=null){if(typeof b!=='object'||Array.isArray(b))throw Error('Datos del negocio no válidos');for(const [k,max] of [['nif',80],['contact',160],['address',240]])if(b[k]!=null&&(typeof b[k]!=='string'||b[k].length>max))throw Error('Datos del negocio no válidos');if(b.logo){const l=b.logo;if(!Number.isInteger(l.width)||!Number.isInteger(l.height)||l.width<1||l.width>480||l.height<1||l.height>200||typeof l.jpeg!=='string'||l.jpeg.length>180000||!/^\/9j\/[A-Za-z0-9+/]*={0,2}$/.test(l.jpeg))throw Error('Logo no válido')}}
  if(d.tpv!=null){if(!root.CATPV)throw Error("Actualiza la app para abrir los datos TPV.");root.CATPV.validate(d)}
  return d;
 }
 function key(uid){return uid?'mcp_v2_user_'+uid:'mcp_v2_guest'}
 function read(uid){
  const s=localStorage.getItem(key(uid));
  if(s){const e=JSON.parse(s);e.data=validate(e.data);return e}
  const old=!uid&&localStorage.getItem(LEGACY);
  return {data:old?validate(JSON.parse(old)):empty(),revision:0,dirty:false,commitId:null};
 }
 const api={empty,validate,key,read,uid:null,envelope:null,
  generation:0,storageVersion:null,
  open(uid){const e=read(uid);this.uid=uid;this.envelope=e;this.storageVersion=localStorage.getItem(key(uid));this.generation++;return structuredClone(e.data)},
  writable:true,
  persist(e){if(!this.writable)throw Error('Mis Cuentas PRO está abierto en otra ventana. Cierra la otra ventana y vuelve a abrir esta antes de guardar.');if(localStorage.getItem(key(this.uid))!==this.storageVersion)throw Error('Otra ventana ha cambiado estos datos. Exporta tu borrador si lo necesitas y vuelve a abrir la app antes de guardar.');const text=JSON.stringify(e);localStorage.setItem(key(this.uid),text);this.storageVersion=text;this.envelope=structuredClone(e)},
  save(d){const e={...this.envelope,data:validate(d),dirty:true,commitId:crypto.randomUUID()};this.persist(e)},
  backup(d,label){const k='mcp_v2_backup_'+(this.uid||'guest')+'_'+Date.now()+'_'+label;localStorage.setItem(k,JSON.stringify(d));return k}
 };
 root.CAStore=api;root.MCPStore=api;
 if(root.navigator?.locks?.request){
  let epoch=0,release=null,visible=true,pending=Promise.resolve();
  const warn=()=>{const el=root.document?.getElementById('syncStatus');if(el)el.textContent='Otra ventana tiene abierta la app. Cierra esa ventana y vuelve a abrir esta para guardar.'};
  function acquire(){
   const current=++epoch;api.writable=false;
   pending=root.navigator.locks.request('mcp-editor',{mode:'exclusive',ifAvailable:true},async lock=>{
    if(current!==epoch||!visible)return;
    if(!lock){if(root.document?.readyState==='loading')root.document.addEventListener('DOMContentLoaded',warn,{once:true});else warn();return}
    api.writable=true;
    // persist still compares storageVersion, so returning never overwrites another editor's changes.
    await new Promise(resolve=>{release=resolve});
   }).catch(()=>{if(current===epoch)api.writable=false});
  }
  root.addEventListener('pagehide',()=>{visible=false;++epoch;api.writable=false;const done=release;release=null;if(done)done()});
  root.addEventListener('pageshow',event=>{if(event.persisted){visible=true;const current=epoch;pending.finally(()=>{if(visible&&epoch===current)acquire()})}});
  acquire();
 }
})(globalThis);
