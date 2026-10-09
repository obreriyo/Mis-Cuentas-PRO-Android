const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const values=new Map(),els=new Map();
const element=id=>{if(!els.has(id))els.set(id,{value:'',textContent:'',innerHTML:'',style:{},open:false,remove(){},addEventListener(){},close(){this.open=false}});return els.get(id)};
const ctx=vm.createContext({console,structuredClone,TextEncoder,TextDecoder,btoa,atob,Blob,crypto:require('crypto').webcrypto,localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),key:i=>[...values.keys()][i],get length(){return values.size}},document:{getElementById:element,addEventListener(){},querySelector(){return {}}},navigator:{onLine:true},owner:element('owner'),irpf:element('irpf'),confirm:()=>true,render(){},setTimeout:()=>1,clearTimeout(){},downloadFileCompat:async()=>{},firebase:{initializeApp(){throw Error('Test transport')},firestore:{FieldValue:{serverTimestamp:()=>123}}}});
ctx.window={addEventListener(){}};
vm.runInContext(fs.readFileSync('app/src/main/assets/store.js','utf8'),ctx);
vm.runInContext(fs.readFileSync('app/src/main/assets/sync-codec.js','utf8'),ctx);
vm.runInContext('let data=CAStore.open(null); function save(){CAStore.save(data);render();}',ctx);
vm.runInContext(fs.readFileSync('app/src/main/assets/cloud.js','utf8'),ctx);
vm.runInContext('authReady=true',ctx);
const browser=fs.readFileSync('tests/browser.cjs','utf8');
let body=browser.split('const results=await page.evaluate(async()=>{')[1].split('\n });')[0].replaceAll('MCPStore','CAStore');
(async()=>{
 const result=await vm.runInContext('(async()=>{'+body+'})()',ctx);assert.equal(result.status,'OK');
 await vm.runInContext(`(async()=>{
 cloudUser={uid:'offline'};CAStore.open('offline');refreshAccountData();data.settings.owner='Offline';save();navigator.onLine=false;await syncCloud(true);if(!CAStore.envelope.dirty)throw Error('Offline data lost');navigator.onLine=true;
 let resetEmail='';auth={sendPasswordResetEmail:async e=>resetEmail=e};$('authEmail').value='test@example.com';await accountAction('reset');if(resetEmail!=='test@example.com')throw Error('Password reset');
 })()`,ctx);
 await vm.runInContext(`(async()=>{
 cloudUser={uid:'large'};CAStore.open('large');refreshAccountData();data.movements=Array.from({length:12000},(_,i)=>({id:i+1,date:'2026-10-09',type:'Ingreso',concept:'Manicura de Ana ñ €',total:18.5,vat:21,paymentMethod:'cash'}));save();let remote=null;
 const ref={get:async()=>({exists:!!remote,data:()=>remote})};db={doc:()=>ref,runTransaction:async fn=>fn({get:async()=>({exists:!!remote,data:()=>remote}),set:(_,value)=>remote=value})};await syncCloud(true);if(!remote||CAStore.envelope.dirty||!JSON.parse(remote.payload)._caCodec)throw Error('Large compressed upload');
 const good=remote.payload;CAStore.persist({...CAStore.envelope,revision:0,data:CAStore.empty(),dirty:false});data=CAStore.empty();await syncCloud(true);if(data.movements.length!==12000)throw Error('Large download');
 data.settings.owner='Local';save();const r=CASyncCodec.decode(good);r.settings.owner='Nube';remote={...remote,revision:2,commitId:'remote',payload:CASyncCodec.encode(r)};await syncCloud(true);if(!conflict)throw Error('Large conflict');await resolveConflict(false);if(data.settings.owner!=='Nube'||data.movements.length!==12000)throw Error('Large conflict resolution');
 const saved=CAStore.envelope.revision,packed=JSON.parse(remote.payload);remote={...remote,revision:saved+1,payload:JSON.stringify({...packed,checksum:'damaged'})};await syncCloud(true);if(data.movements.length!==12000||CAStore.envelope.revision!==saved)throw Error('Corrupted remote overwrote local');
 })()`,ctx);
 await vm.runInContext(`(async()=>{
 let listener;firebase.initializeApp=()=>{};firebase.auth=()=>({setPersistence:async()=>{},onAuthStateChanged:fn=>listener=fn});firebase.auth.Auth={Persistence:{LOCAL:'local'}};firebase.firestore=()=>({});
 document.querySelectorAll=()=>[$('workCalendarDialog')];data=CAStore.open(null);$('workCalendarDialog').open=true;$('dlg').open=true;
 await initCloud();listener(null);if(!$('workCalendarDialog').open||!$('dlg').open)throw Error('Initial auth closed a draft');
 data.settings.owner='Borrador sin guardar';listener(null);if(data.settings.owner!=='Borrador sin guardar')throw Error('Same account replaced a draft');
 navigator.onLine=false;listener({uid:'another-account',email:'test@example.com'});if($('workCalendarDialog').open||$('dlg').open||CAStore.uid!=='another-account')throw Error('Account change did not close old dialogs');navigator.onLine=true;
 })()`,ctx);
 console.log('OK sesión inicial conserva borradores y diálogos; cambiar cuenta los cierra');
 console.log('OK nube grande: compresión, descarga, conflictos, recuperación e integridad');
 console.log('OK: uploads, downloads, conflicts, concurrent edits, retries, account isolation, offline storage, password reset',result);
})().catch(e=>{console.error(e);process.exit(1)});
