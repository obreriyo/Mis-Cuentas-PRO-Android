const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const values=new Map(),elements=new Map();
function el(id){if(!elements.has(id))elements.set(id,{value:'',textContent:'',innerHTML:'',style:{},classList:{contains(){return false}},addEventListener(){},close(){},showModal(){},remove(){}});return elements.get(id)}
const html=fs.readFileSync('app/src/main/assets/index.html','utf8');
const context={console,Blob,TextEncoder,structuredClone,crypto:require('crypto').webcrypto,document:{getElementById:el,addEventListener(){},querySelector(){return {classList:{contains(){return false}}}}},localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)},window:{addEventListener(){}},navigator:{},setTimeout(){},confirm:()=>true,alert:message=>{throw Error(message)}};
for(const match of html.matchAll(/id="([^"]+)"/g))context[match[1]]=el(match[1]);
const ctx=vm.createContext(context);
for(const name of ['tpv-core.js','store.js','payments.js'])vm.runInContext(fs.readFileSync('app/src/main/assets/'+name,'utf8'),ctx);
let source=fs.readFileSync('app/src/main/assets/app.js','utf8').replace('\ninit();','\n').replace('\ninitAndroidBackNavigation();','\n');
vm.runInContext(source,ctx);el('year').value='2026';el('reportMonth').value='1';el('benefitMonth').value='1';
const movement=(id,method,total,date='2026-01-01')=>({id,date,type:'Ingreso',concept:'Venta',total,vat:21,...(method?{paymentMethod:method}:{})});
const records=[movement(1,null,100),movement(2,'cash',200),movement(3,'card',300),movement(4,'transfer',400)];
context.fixture={movements:records,bank:[{id:5,date:'2026-01-02',amount:50}],settings:{owner:'Negocio de prueba',irpf:20},nonworking:[],gestIncome:{}};
vm.runInContext('data=CAStore.validate(fixture);CAStore.open(null);CAStore.persist({data,revision:0,dirty:false,commitId:null});',ctx);
const run=code=>vm.runInContext(code,ctx);
let totals=run('CAPayments.split(data.movements)');assert.equal(totals.cash,200);assert.equal(totals.card,300);assert.equal(totals.transfer,400);assert.equal(totals.unspecified,100);assert.equal(totals.total,1000);
let month=run('CAPayments.cashYear(data.movements,data.bank,2026)[0]');assert.equal(month.cash,150);assert.equal(month.provisionalCash,250);assert.equal(month.bankEntries,750);
assert.equal(run('monthlyBenefit(2026,1).inc'),1000);assert.equal(run('monthlyIncomeRows().reduce((s,r)=>s+r.total,0)'),1000);
run('buildMonthlyReport();renderCash();renderBenefits()');
assert.match(el('monthlyReport').innerHTML,/Efectivo/);assert.match(el('monthlyReport').innerHTML,/Tarjeta/);assert.match(el('monthlyReport').innerHTML,/Transferencia/);assert.match(el('cashSummary').innerHTML,/Caja provisional/);assert.equal((el('bankHistory').innerHTML.match(/Tarjeta · cobro registrado/g)||[]).length,1);
const previous=run('JSON.stringify(data.movements[0])');assert.equal(JSON.parse(previous).paymentMethod,undefined);
run("setPaymentMethod(1,'card')");assert.equal(run('data.movements[0].paymentMethod'),'card');assert.equal(run('monthlyBenefit(2026,1).inc'),1000);assert.equal(run('CAPayments.cashYear(data.movements,data.bank,2026)[0].cash'),150);assert.equal(run('CAPayments.cashYear(data.movements,data.bank,2026)[0].bankEntries'),850);assert.equal(run('data.bank.length'),1);
assert.equal(run("CAStore.validate(JSON.parse(JSON.stringify(data))).movements[0].paymentMethod"),'card');
assert.throws(()=>run("CAStore.validate({...data,movements:[{...data.movements[0],paymentMethod:'invalid'}]})"),/Forma de cobro/);
run("setPaymentMethod(1,'unspecified')");assert.equal(run('CAPayments.split(data.movements).unspecified'),100);
run("data.movements.push({id:6,date:'2026-02-01',type:'Ingreso',total:-20,vat:21,concept:'Devolución',paymentMethod:'card'})");
assert.equal(run('CAPayments.cashYear(data.movements,data.bank,2026)[1].bankEntries'),730);
assert.equal(run('CAPayments.cashYear(data.movements,data.bank,2027)[0].bankEntries'),0);
run("data.movements.push({id:7,date:'2026-07-01',type:'Ingreso',total:80,vat:21,concept:'Venta',paymentMethod:'cash'});data.bank.push({id:8,date:'2026-07-01',amount:20})");
month=run('CAPayments.cashYear(data.movements,data.bank,2026)[6]');assert.equal(month.cash,210);assert.equal(month.provisionalCash,310);assert.equal(month.bankEntries,750);
// Explicit selection for new incomes, with expenses independent of payment method.
run("date.value='2026-01-03';type.value='Ingreso';total.value='25,00';vat.value='21';withholding.value='0';concept.value='Venta';paymentMethod.value='' ");
assert.throws(()=>run('addMovement()'),/Elige cómo/);
run("paymentMethod.value='card';addMovement()");assert.equal(run('data.movements.at(-1).paymentMethod'),'card');assert.equal(run('data.bank.length'),2);
run("type.value='Gasto';total.value='10,00';expenseCategory.value='otros';irpfDeductible.checked=false;vatDeductible.checked=false;addMovement()");assert.equal(run('data.movements.at(-1).paymentMethod'),undefined);
// Produce a real PDF through the app's own generator, plus a full-month pagination fixture.
(async()=>{
 const out=path.join(process.cwd(),'tmp/pdfs');fs.mkdirSync(out,{recursive:true});
 run('data=CAStore.validate(fixture)');
 const blob=run('makeMonthlyPdfBytes()');fs.writeFileSync(path.join(out,'cobros-prueba.pdf'),Buffer.from(await blob.arrayBuffer()));
 run("data.movements=Array.from({length:31},(_,i)=>({id:i+100,date:'2026-01-'+String(i+1).padStart(2,'0'),type:'Ingreso',concept:'Venta',total:121,vat:21,paymentMethod:['cash','card','transfer'][i%3]}))");
 const all=run('makeMonthlyPdfBytes()');fs.writeFileSync(path.join(out,'cobros-mes-completo.pdf'),Buffer.from(await all.arrayBuffer()));
 console.log('OK: payment selection, legacy import, categorization, tax totals, refunds, year boundary, cash/bank separation, no duplicated deposits and PDF generation.');
})().catch(e=>{console.error(e);process.exit(1)});
