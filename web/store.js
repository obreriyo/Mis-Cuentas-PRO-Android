/* Local persistence is authoritative while offline. No Firebase cache contains accounts. */
(function(root){
 'use strict';
 const LEGACY='mis_cuentas_pro_web_v1';
 const empty=()=>({movements:[],bank:[],settings:{owner:'',irpf:20},nonworking:[],gestIncome:{}});
 function validate(value){
  const d=JSON.parse(JSON.stringify(value));
  if(!d||!Array.isArray(d.movements)||!Array.isArray(d.bank)||!d.settings||typeof d.settings.owner!=='string'||!Number.isFinite(d.settings.irpf))throw Error('Copia no válida');
  d.nonworking=d.nonworking||[];d.gestIncome=d.gestIncome||{};
  const date=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x);
  if(!Array.isArray(d.nonworking)||!d.nonworking.every(date)||typeof d.gestIncome!=='object'||Array.isArray(d.gestIncome))throw Error('Fechas no válidas');
  for(const m of d.movements){
   if(!Number.isSafeInteger(m.id)||!date(m.date)||!['Ingreso','Gasto'].includes(m.type)||typeof m.concept!=='string'||!Number.isFinite(m.total)||!Number.isFinite(m.vat)||m.vat===-100)throw Error('Movimiento no válido');
   for(const k of ['accounting','withholding'])if(m[k]!=null&&!Number.isFinite(m[k]))throw Error('Importe no válido');
  }
  for(const b of d.bank)if(!Number.isSafeInteger(b.id)||!date(b.date)||!Number.isFinite(b.amount))throw Error('Banco no válido');
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
  open(uid){const e=read(uid);this.uid=uid;this.envelope=e;return structuredClone(e.data)},
  persist(e){localStorage.setItem(key(this.uid),JSON.stringify(e));this.envelope=e},
  save(d){const e={...this.envelope,data:validate(d),dirty:true,commitId:crypto.randomUUID()};this.persist(e)},
  backup(d,label){const k='mcp_v2_backup_'+(this.uid||'guest')+'_'+Date.now()+'_'+label;localStorage.setItem(k,JSON.stringify(d));return k}
 };
 root.MCPStore=api;
})(globalThis);
