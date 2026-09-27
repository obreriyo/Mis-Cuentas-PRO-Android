const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),assets=path.join(root,'app/src/main/assets');
const read=p=>fs.readFileSync(path.join(assets,p),'utf8');
for(const name of ['app.js','store.js','cloud.js','boot.js','sw.js'])new vm.Script(read(name),{filename:name});
for(const name of fs.readdirSync(assets,{recursive:true}).filter(n=>fs.statSync(path.join(assets,n)).isFile()))assert.deepEqual(fs.readFileSync(path.join(assets,name)),fs.readFileSync(path.join(root,'web',name)),`Android/web difieren: ${name}`);
const storage=new Map(),ctx=vm.createContext({localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},structuredClone,crypto:require('node:crypto').webcrypto,console});
vm.runInContext(read('store.js'),ctx);
const store=ctx.MCPStore;
const sample={movements:[{id:1,date:'2026-01-04',type:'Ingreso',concept:'Venta',total:121,vat:21,accounting:242,withholding:7},{id:2,date:'2026-01-05',type:'Gasto',concept:'Material',total:60.5,vat:21,irpfDeductible:true,vatDeductible:true},{id:3,date:'2026-01-06',type:'Gasto',concept:'Seguro',total:30,vat:0,irpfDeductible:true,vatDeductible:false}],bank:[{id:4,date:'2026-01-05',amount:40}],nonworking:['2026-01-02'],settings:{owner:'Empresa',irpf:20},gestIncome:{}};
storage.set('mis_cuentas_pro_web_v1',JSON.stringify(sample));assert.equal(store.open(null).movements.length,3);
store.open('alice');assert.equal(store.envelope.data.movements.length,0);store.save(sample);assert.equal(store.envelope.dirty,true);const commit=store.envelope.commitId;
store.open('bob');assert.equal(store.envelope.data.movements.length,0);store.open('alice');assert.equal(store.envelope.commitId,commit);
assert.throws(()=>store.validate({movements:[]}));assert.throws(()=>store.validate({...sample,bank:[{id:'bad'}]}));
store.backup(sample,'test');assert.ok([...storage.keys()].some(k=>k.startsWith('mcp_v2_backup_alice_')));
// Fixed expected results exercise original fiscal calculations, not a reimplementation.
const code=read('app.js');
function functionSource(name){const start=code.indexOf('function '+name+'(');assert.ok(start>=0);const next=code.indexOf('\nfunction ',start+1);return code.slice(start,next<0?undefined:next).trim()}
const calc=vm.createContext({data:sample,quarters:{},cashSummary:{},bankHistory:{},document:{getElementById:()=>({value:'1'})},MONTHS:Array.from({length:12},(_,i)=>'Mes '+(i+1)),currentYear:()=>2026,eur:n=>Number(n).toFixed(2),console});
for(const name of ['vals','renderQuarters','renderCash','monthlyIncomeRows'])vm.runInContext(functionSource(name),calc);
assert.equal(calc.vals({total:121,vat:21}).base,100);calc.renderQuarters();assert.match(calc.quarters.innerHTML,/IVA estimado 31\.50/);assert.match(calc.quarters.innerHTML,/>10\.00</);
calc.renderCash();assert.match(calc.cashSummary.innerHTML,/>81\.00</);assert.match(calc.cashSummary.innerHTML,/Banco 40\.00/);
assert.equal(calc.monthlyIncomeRows()[0].total,242);assert.equal(calc.monthlyIncomeRows()[0].base,200);
const baseline=JSON.parse(fs.readFileSync(path.join(__dirname,'calculation-baseline.json'),'utf8'));
for(const [name,hash]of Object.entries(baseline)){const actual=require('node:crypto').createHash('sha256').update(functionSource(name)).digest('hex');assert.equal(actual,hash,`La función contable ${name} difiere del original`)}
assert.match(fs.readFileSync(path.join(root,'app/src/main/AndroidManifest.xml'),'utf8'),/android.permission.INTERNET/);
assert.match(fs.readFileSync(path.join(root,'firestore.rules'),'utf8'),/request.auth.uid == uid/);
console.log('OK: sintaxis, igualdad Android/web, aislamiento local, migración de datos, validación, copias, cálculos y huellas originales.');
