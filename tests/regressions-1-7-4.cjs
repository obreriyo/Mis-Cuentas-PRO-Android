const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
(async()=>{
 const h=require('./helpers/app-dom.cjs')(),{run,el,w}=h;
 run(`data=CAStore.empty();const t=CATPV.ensure(data);t.customers.push({id:'c',name:'Cliente',phone:'',email:'',notes:'',archived:false});t.products.push({id:'p',name:'Producto',category:'',kind:'product',price:1000,vat:21,tracked:false,stock:0,archived:false});CATPV.sell(data,{cart:[{productId:'p',qty:1}],customerId:'c',date:'2026-10-09',method:'pending',discountBps:0,due:'2026-10-10'});save();CATPVUI.settleDialog(data.tpv.sales[0].id)`);
 el('tpvPaymentMethod').value='cash';el('tpvPaymentMethod').dispatchEvent(new w.Event('change',{bubbles:true}));run('CATPVUI.confirmPayment()');assert.equal(run('data.tpv.sales[0].status'),'paid');assert.equal(w.CAFormState.hasDraft(),false);
 el('appointmentPhone').value='600123456';el('appointmentPhone').dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(w.CAFormState.hasDraft(),false);
 el('concept').dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(w.CAFormState.hasDraft(),true);el('appointmentPhone').dispatchEvent(new w.Event('input',{bubbles:true}));assert.deepEqual([...w.CAFormState.pages],['movement']);w.CAFormState.clear('all');run("CATPVUI.add('p')");assert.equal(w.CAFormState.hasDraft(),true);w.close();
 console.log('OK Cobro y teléfono no crean borradores; movimiento y carrito sí');
 const listeners={},storage=new Map();let held=false,deny=false;
 const c={structuredClone,crypto:require('crypto').webcrypto,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},navigator:{locks:{request:async(n,o,cb)=>{if(held||deny)return cb(null);held=true;try{return await cb({})}finally{held=false}}}},addEventListener:(n,fn)=>listeners[n]=fn};c.globalThis=c;vm.createContext(c);vm.runInContext(fs.readFileSync('app/src/main/assets/store.js','utf8'),c);c.CAStore.open(null);
 const tick=()=>new Promise(r=>setImmediate(r));await tick();assert.equal(c.CAStore.writable,true);listeners.pagehide();listeners.pageshow({persisted:true});await tick();assert.equal(c.CAStore.writable,true);c.CAStore.save(c.CAStore.empty());
 listeners.pagehide();storage.set(c.CAStore.key(null),'changed elsewhere');listeners.pageshow({persisted:true});await tick();assert.throws(()=>c.CAStore.save(c.CAStore.empty()),/Otra ventana ha cambiado/);
 listeners.pagehide();deny=true;listeners.pageshow({persisted:true});await tick();assert.equal(c.CAStore.writable,false);
 console.log('OK Atrás recupera el bloqueo y protege cambios de otra ventana');
 const gradle=fs.readFileSync('app/build.gradle','utf8');assert.match(gradle,/debug \{ signingConfig signingConfigs.controlFixed \}/);assert.match(gradle,/ba6a6ab18f22b25865cbbf5d4aa312b707a474b09ff1361f2f6448ae7518bef9/);console.log('OK Configuración permanente de firma fija');
})().catch(e=>{console.error(e);process.exit(1)});
