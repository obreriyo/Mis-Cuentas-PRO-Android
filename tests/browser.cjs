const fs=require('fs'),http=require('http'),path=require('path'),assert=require('assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../web');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webmanifest':'application/manifest+json'};
const server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;const file=path.join(root,pathname==='/'?'index.html':pathname);try{res.setHeader('Content-Type',types[path.extname(file)]||'text/plain');res.end(fs.readFileSync(file))}catch{res.statusCode=404;res.end()}});
fs.mkdirSync(path.resolve(__dirname,'../test-results'),{recursive:true});const errors=[];
(async()=>{
 await new Promise(r=>server.listen(8765,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,channel:process.env.MCP_BROWSER_CHANNEL||undefined});
 const context=await browser.newContext({viewport:{width:1280,height:900}});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.goto('http://127.0.0.1:8765');await page.waitForFunction(()=>typeof authReady!=='undefined'&&authReady);
 await page.getByRole('button',{name:'Añadir movimiento',exact:true}).click();await page.locator('#concept').fill('Venta de prueba');await page.locator('#total').fill('121');await page.getByRole('button',{name:'Guardar movimiento',exact:true}).click();
 await page.waitForFunction(()=>document.getElementById('income').textContent.includes('121,00'));
 await page.reload();await page.waitForFunction(()=>document.getElementById('income').textContent.includes('121,00'));
 const second=await context.newPage();await second.goto('http://127.0.0.1:8765');await second.getByRole('heading',{name:'Mis Cuentas PRO ya está abierta'}).waitFor();await second.close();
 await page.screenshot({path:path.resolve(__dirname,'../test-results/desktop.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.resolve(__dirname,'../test-results/mobile.png'),fullPage:true});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Sin desbordamiento móvil');
 await page.evaluate(()=>{show('settings');buildMonthlyReport()});
 await page.emulateMedia({media:'print'});
 assert.ok(await page.locator('#monthlyReport').isVisible(),'Informe imprimible también desde Ajustes');
 await page.pdf({path:path.resolve(__dirname,'../test-results/report-test.pdf'),format:'A4'});
 await page.emulateMedia({media:'screen'});
 await page.evaluate(()=>{window.__printed=0;window.AndroidPrint={printPage:()=>window.__printed++};printMonthlyReport()});
 await page.waitForFunction(()=>window.__printed===1);
 await page.evaluate(()=>{delete window.AndroidPrint;show('home')});
 // Fake the transport only; run the real account/synchronization implementation.
 const results=await page.evaluate(async()=>{
  const store=MCPStore;const original=data;let remote=null;let reads=0,writes=0;let during=null;
  const ref={get:async()=>{reads++;return {exists:!!remote,data:()=>remote}}};
  db={doc:()=>ref,runTransaction:async fn=>fn({get:async()=>{reads++;if(during){const f=during;during=null;f()}return {exists:!!remote,data:()=>remote}},set:(_,value)=>{writes++;remote=value}})};
  cloudUser={uid:'alice',email:'alice@example.test'};store.open('alice');refreshAccountData();
  data=structuredClone(original);save();clearTimeout(timer);await syncCloud(true);
  if(remote.revision!==1||store.envelope.dirty)throw Error('Primera subida');
  data.settings.owner='Cambio local';save();clearTimeout(timer);remote={...remote,revision:2,payload:JSON.stringify({...original,settings:{owner:'PC',irpf:20}}),commitId:'pc'};await syncCloud(true);
  if(!conflict||remote.revision!==2||!store.envelope.dirty)throw Error('Protección de conflicto');
  await resolveConflict(false);if(data.settings.owner!=='PC'||store.envelope.dirty)throw Error('Resolver con nube');
  data.settings.owner='A';save();clearTimeout(timer);during=()=>{data.settings.owner='B';save();clearTimeout(timer)};await syncCloud(true);
  if(!store.envelope.dirty||store.envelope.data.settings.owner!=='B')throw Error('Edición durante subida');clearTimeout(timer);await syncCloud(true);
  if(JSON.parse(remote.payload).settings.owner!=='B'||store.envelope.dirty)throw Error('Segunda subida');
  // Lost acknowledgement retry must not produce a false conflict.
  data.settings.owner='C';save();clearTimeout(timer);remote={...remote,revision:remote.revision+1,payload:JSON.stringify(data),commitId:store.envelope.commitId};await syncCloud(true);
  if(conflict||store.envelope.dirty)throw Error('Reintento idempotente');
  cloudUser={uid:'bob'};store.open('bob');refreshAccountData();if(data.movements.length)throw Error('Aislamiento cuentas');
  cloudUser=null;store.open(null);refreshAccountData();
  return {reads,writes,status:'OK'};
 });
 await context.setOffline(true);await page.reload();await page.waitForFunction(()=>document.getElementById('income').textContent.includes('121,00'));
 await page.getByRole('button',{name:'Añadir movimiento',exact:true}).click();await page.locator('#concept').fill('Sin conexión');await page.locator('#total').fill('10');await page.getByRole('button',{name:'Guardar movimiento',exact:true}).click();await page.waitForFunction(()=>document.getElementById('income').textContent.includes('131,00'));
 assert.deepEqual(errors,[]);console.log(JSON.stringify({browser:'OK',offline:'OK',cloudSimulation:results,pageErrors:errors}));
 await browser.close();server.close();
})().catch(e=>{console.error(e);server.close();process.exit(1)});

