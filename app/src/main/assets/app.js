function escapeHTML(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}

const MONTHS=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const KEY="mis_cuentas_pro_web_v1";
let data=MCPStore.open(null);
data.movements=data.movements||[];data.bank=data.bank||[];data.settings=data.settings||{owner:"",irpf:20};data.nonworking=data.nonworking||[];data.gestIncome=data.gestIncome||{};
data.movements.forEach(m=>{if(m.accounting==null)m.accounting=+m.total||0;if(m.gestoria==null)m.gestoria=false;if(m.type==="Gasto"){if(m.category==null)m.category="otros";if(m.irpfDeductible==null)m.irpfDeductible=true;if(m.vatDeductible==null)m.vatDeductible=true}});
const eur=n=>Number(n||0).toLocaleString("es-ES",{minimumFractionDigits:2,maximumFractionDigits:2})+" €";
function save(){try{MCPStore.save(data);render();if(window.scheduleSync)scheduleSync()}catch(e){alert('No se pudo guardar: '+e.message+'. Exporta una copia antes de cerrar.');throw e}}
function currentYear(){return +document.getElementById("year").value}
let handlingAndroidBack=false;
function activatePage(id,b){
 document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));
 document.getElementById(id).classList.add("active");
 document.querySelectorAll(".nav button").forEach(x=>x.classList.remove("active"));
 if(b)b.classList.add("active"); else {let btn=document.querySelector(`.nav button[onclick*="show('${id}'"]`);if(btn)btn.classList.add("active")}
 render();updateFabForPage();
}
function show(id,b){
 activatePage(id,b);
 if(!handlingAndroidBack && history.state?.page!==id) history.pushState({mcp:true,page:id},"",location.href);
}
function init(){
 let y=new Date().getFullYear(), sel=document.getElementById("year");for(let n=y-5;n<=y+5;n++)sel.add(new Option(n,n));sel.value=y;sel.onchange=render;
 owner.value=data.settings.owner||"";irpf.value=data.settings.irpf??20;
 date.value=new Date().toISOString().slice(0,10);bankDate.value=date.value;
 months.innerHTML=MONTHS.map((m,i)=>`<button onclick="renderMonth(${i+1})">${m}</button>`).join("");
 [reportMonth,gestMonth].forEach(sel=>{sel.innerHTML=MONTHS.map((m,i)=>`<option value="${i+1}">${m}</option>`).join("");sel.value=new Date().getMonth()+1});render()
}
function vals(m){let t=+m.total||0,r=+m.vat||0,base=t/(1+r/100);return{base,vat:t-base,total:t}}
function render(){
 let y=currentYear(), ms=data.movements.filter(m=>+m.date.slice(0,4)==y),inc=ms.filter(m=>m.type=="Ingreso").reduce((a,m)=>a+(+m.total||0),0),exp=ms.filter(m=>m.type=="Gasto").reduce((a,m)=>a+(+m.total||0),0);
 income.textContent="+"+eur(inc);expense.textContent="-"+eur(exp);balance.textContent=eur(inc-exp);
 recent.innerHTML=ms.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6).map(m=>movementHTML(m)).join("")||'<div class="panel small">Todavía no hay movimientos.</div>';
 renderQuarters();renderCash()
}
function movementHTML(m){
 let acc=m.accounting??m.total,changed=Math.abs(acc-(+m.total||0))>.001; let cat=m.type==="Gasto"?categoryName(m.category):"";
 return `<div class="movement"><div class="ico">${m.type==="Ingreso"?"↓":"↑"}</div><div><div class="mname">${escapeHTML(m.concept||m.type)}</div><div class="sub">${m.date}${cat?` · ${cat}`:""} · IVA ${m.vat||0}% ${changed?`· <span class="badge">Contable ${eur(acc)}</span>`:""}</div><div class="actions"><button class="tiny" onclick="editAccounting(${m.id})">Contable</button><button class="tiny danger" onclick="deleteMove(${m.id})">Borrar</button></div></div><div class="amt ${m.type=="Ingreso"?"green":"red"}">${m.type=="Ingreso"?"+":"-"}${eur(m.total)}</div></div>`}
function editAccounting(id){let m=data.movements.find(x=>x.id==id);if(!m)return;let v=prompt("Importe contable. El importe original NO cambiará:",String(m.accounting??m.total).replace(".",","));if(v===null)return;let n=parseFloat(v.replace(",","."));if(!isNaN(n)&&n>=0){m.accounting=n;save()}}
function deleteMove(id){if(confirm("¿Borrar este movimiento?")){data.movements=data.movements.filter(x=>x.id!=id);save()}}
const CATEGORY_NAMES={material:"Compras / materiales",gestoria:"Gestoría / servicios profesionales",autonomos:"Cuota de autónomos (RETA)",suministros:"Suministros",alquiler:"Alquiler",seguros:"Seguros",transporte:"Vehículo / transporte",formacion:"Formación",otros:"Otros gastos"};
function categoryName(v){return CATEGORY_NAMES[v]||"Otros gastos"}
function syncMovementForm(){let isExpense=type.value==="Gasto";expenseFiscalFields.style.display=isExpense?"block":"none";deductibleFields.style.display=isExpense?"block":"none";if(isExpense)applyExpenseCategory();else{vat.disabled=false;vatDeductible.checked=false;irpfDeductible.checked=false;fiscalHint.textContent=""}}
const EXPENSE_PRESETS={
 material:{vat:21,irpf:true,vatDed:true,hint:"Configuración habitual para compras y materiales afectos a la actividad: IRPF e IVA deducibles. Comprueba siempre la factura."},
 gestoria:{vat:21,irpf:true,vatDed:true,hint:"Configuración habitual de gestoría y servicios profesionales afectos a la actividad: IRPF e IVA deducibles. Ajusta la retención si la factura la incluye."},
 autonomos:{vat:0,irpf:true,vatDed:false,lockVat:true,hint:"Cuota de autónomos (RETA): gasto deducible en IRPF y sin IVA deducible."},
 suministros:{vat:21,irpf:true,vatDed:true,hint:"Predeterminado como gasto afecto a la actividad. Si es un suministro compartido con vivienda/uso personal, la deducción puede ser parcial: ajusta el registro según corresponda."},
 alquiler:{vat:21,irpf:true,vatDed:true,hint:"Predeterminado para alquiler de local afecto a la actividad. Revisa factura, IVA y retención: pueden variar según el inmueble y el arrendamiento."},
 seguros:{vat:0,irpf:true,vatDed:false,lockVat:true,hint:"Los seguros suelen estar exentos de IVA: IRPF deducible si está vinculado a la actividad y sin IVA deducible."},
 transporte:{vat:21,irpf:false,vatDed:false,hint:"Vehículo/transporte requiere especial cuidado: la deducibilidad depende del uso y del impuesto. Por seguridad queda sin deducir por defecto; actívala solo cuando corresponda."},
 formacion:{vat:21,irpf:true,vatDed:true,hint:"Predeterminado como formación relacionada con la actividad. Algunas formaciones pueden estar exentas de IVA: copia el IVA real de la factura."},
 otros:{vat:21,irpf:false,vatDed:false,hint:"Otros gastos queda sin deducción automática. Marca IRPF y/o IVA únicamente si el gasto está vinculado a la actividad y cumple los requisitos."}
};
function applyExpenseCategory(){let p=EXPENSE_PRESETS[expenseCategory.value]||EXPENSE_PRESETS.otros;vat.disabled=false;vat.value=p.vat;irpfDeductible.checked=p.irpf;vatDeductible.checked=p.vatDed;vat.disabled=!!p.lockVat;fiscalHint.textContent=p.hint}
function openAdd(){date.value=new Date().toISOString().slice(0,10);type.value="Ingreso";vat.value=21;withholding.value=0;syncMovementForm();dlg.showModal()}
type.addEventListener("change",syncMovementForm);
function addMovement(){let n=parseFloat(total.value.replace(",","."));if(!date.value||!n)return alert("Indica fecha e importe.");if(type.value==="Ingreso"&&data.nonworking.includes(date.value))return alert("Este día está marcado como no trabajado. No puedes registrar ingresos en esta fecha.");let isExpense=type.value==="Gasto",c=isExpense?expenseCategory.value:null,v=+vat.value||0;if(c==="autonomos")v=0;data.movements.push({id:newRecordId(),type:type.value,date:date.value,concept:concept.value,total:n,accounting:n,vat:v,withholding:+withholding.value||0,gestoria:false,category:c,irpfDeductible:isExpense?irpfDeductible.checked:false,vatDeductible:isExpense?vatDeductible.checked:false});concept.value="";total.value="";dlg.close();save()}
function renderMonth(m){
 show("moves",document.querySelectorAll(".nav button")[1]);let y=currentYear(),arr=data.movements.filter(x=>+x.date.slice(0,4)==y&&+x.date.slice(5,7)==m).sort((a,b)=>b.date.localeCompare(a.date));
 let days=new Date(y,m,0).getDate(),nw=data.nonworking.filter(d=>d.startsWith(`${y}-${String(m).padStart(2,"0")}`)).length;
 monthList.innerHTML=`<div class="section">${MONTHS[m-1]} ${y}</div>
 <div class="panel">
   <b>Calendario laboral</b>
   <p class="small">Pulsa directamente sobre cualquier día para marcarlo como no trabajado. Vuelve a pulsarlo para recuperarlo.</p>
   <div class="small" style="margin-bottom:10px"><span class="badge">✓ Trabajado</span> <span class="badge" style="background:#ffe9eb;color:#d94d55">✕ No trabajado (${nw})</span></div>
   <div class="monthgrid">${Array.from({length:days},(_,i)=>{let d=`${y}-${String(m).padStart(2,"0")}-${String(i+1).padStart(2,"0")}`,off=data.nonworking.includes(d);return `<button onclick="toggleDay('${d}')" style="${off?'background:#ffe9eb;color:#d94d55;text-decoration:line-through;border:1px solid #f3b8bd':'border:1px solid transparent'}">${i+1}${off?' ✕':''}</button>`}).join("")}</div>
 </div>`+(arr.map(movementHTML).join("")||'<div class="panel small">Sin movimientos este mes.</div>')
}
function toggleDay(d){let i=data.nonworking.indexOf(d);if(i>=0){data.nonworking.splice(i,1)}else{let existing=data.movements.filter(x=>x.type==="Ingreso"&&x.date===d);if(existing.length){alert(`No puedes marcar este día como no trabajado porque tiene ${existing.length} ingreso${existing.length>1?"s":""} registrado${existing.length>1?"s":""}. Borra o cambia primero esos ingresos.`);return}data.nonworking.push(d)}save();renderMonth(+d.slice(5,7))}
function renderQuarters(){let y=currentYear(),p=+data.settings.irpf||20,out="";for(let q=0;q<4;q++){let arr=data.movements.filter(m=>+m.date.slice(0,4)==y&&Math.floor((+m.date.slice(5,7)-1)/3)==q),ib=0,eb=0,iv=0,ev=0,ret=0;arr.forEach(m=>{let v=vals({...m,total:m.accounting??m.total});if(m.type=="Ingreso"){ib+=v.base;iv+=v.vat;ret+=v.base*(+m.withholding||0)/100}else{if(m.irpfDeductible!==false)eb+=v.base;if(m.vatDeductible!==false)ev+=v.vat}});let iva=iv-ev,irp=Math.max(0,(ib-eb)*p/100-ret);out+=`<div class="movement"><div class="ico">${q+1}T</div><div><div class="mname">Trimestre ${q+1}</div><div class="sub">IVA estimado ${eur(iva)}</div></div><div class="amt">${eur(irp)}<div class="small">IRPF</div></div></div>`}quarters.innerHTML=out}
function addBank(){let n=parseFloat(bankAmount.value.replace(",","."));if(!bankDate.value||!n)return alert("Indica fecha e importe.");data.bank.push({id:newRecordId(),date:bankDate.value,amount:n});bankAmount.value="";save()}
function renderCash(){let y=currentYear(),cash=0,bank=0,out="";for(let m=1;m<=12;m++){let inc=data.movements.filter(x=>x.type=="Ingreso"&&+x.date.slice(0,4)==y&&+x.date.slice(5,7)==m).reduce((a,x)=>a+(+x.total||0),0);let dep=data.bank.filter(x=>+x.date.slice(0,4)==y&&+x.date.slice(5,7)==m).reduce((a,x)=>a+(+x.amount||0),0);cash+=inc-dep;bank+=dep;out+=`<div class="movement"><div class="ico">${m}</div><div><div class="mname">${MONTHS[m-1]}</div><div class="sub">Banco ${eur(dep)}</div></div><div class="amt">${eur(cash)}<div class="small">caja</div></div></div>`}cashSummary.innerHTML=out;bankHistory.innerHTML=data.bank.filter(x=>+x.date.slice(0,4)==y).sort((a,b)=>b.date.localeCompare(a.date)).map(x=>`<div class="movement"><div class="ico">€</div><div><div class="mname">Ingreso al banco</div><div class="sub">${x.date}</div></div><div class="amt">${eur(x.amount)}<div><button class="tiny danger" onclick="deleteBank(${x.id})">Borrar</button></div></div></div>`).join("")||'<div class="panel small">Sin ingresos al banco.</div>'}
function monthlyIncomeRows(){
 let y=currentYear(),m=+document.getElementById("reportMonth").value,days={};
 data.movements.filter(x=>x.type==="Ingreso"&&+x.date.slice(0,4)==y&&+x.date.slice(5,7)==m&&!data.nonworking.includes(x.date)).forEach(x=>{
   let v=vals({...x,total:x.accounting??x.total}),d=days[x.date]||(days[x.date]={date:x.date,total:0,base:0});
   d.total+=v.total; d.base+=v.base;
 });
 return Object.values(days).sort((a,b)=>a.date.localeCompare(b.date));
}
function buildMonthlyReport(){
 let y=currentYear(),m=+document.getElementById("reportMonth").value,arr=monthlyIncomeRows();
 let tt=0,tb=0;
 let rows=arr.map(x=>{tt+=x.total;tb+=x.base;return `<tr><td>${x.date.slice(8,10)}/${x.date.slice(5,7)}/${x.date.slice(0,4)}</td><td>${eur(x.total)}</td><td>${eur(x.base)}</td></tr>`}).join("");
 let totalRow=arr.length?`<tr><th>TOTAL MES</th><th>${eur(tt)}</th><th>${eur(tb)}</th></tr>`:"";
 document.getElementById("monthlyReport").innerHTML=`<h3>${escapeHTML(data.settings.owner||"Nombre de empresa")}</h3><div class="small" style="margin:-6px 0 14px">Registro de ingresos · ${MONTHS[m-1]} ${y}</div><table class="reportTable"><tr><th>Fecha</th><th>Efectivo + IVA</th><th>Base imponible</th></tr>${rows||'<tr><td colspan="3">Sin ingresos registrados</td></tr>'}${totalRow}</table>`;
 const pa=document.getElementById("pdfActions");if(pa)pa.style.display="block";
}
function renderGestoria(){
 let y=currentYear(),m=+gestMonth.value,key=`${y}-${String(m).padStart(2,"0")}`,arr=data.movements.filter(x=>+x.date.slice(0,4)==y&&+x.date.slice(5,7)==m),inc=arr.filter(x=>x.type=="Ingreso"),gas=arr.filter(x=>x.type=="Gasto");
 gestoria.innerHTML=`<div class="check"><input type="checkbox" ${data.gestIncome[key]?"checked":""} onchange="data.gestIncome['${key}']=this.checked;save()"><b>Ingresos del mes entregados</b></div><h3>Gastos</h3>`+(gas.map(x=>`<label class="check"><input type="checkbox" ${x.gestoria?"checked":""} onchange="setGest(${x.id},this.checked)"><span>${x.date.slice(8,10)} · ${escapeHTML(x.concept||"Gasto")} · ${eur(x.total)}</span></label>`).join("")||'<p class="small">Sin gastos este mes.</p>')
}
function setGest(id,v){let m=data.movements.find(x=>x.id==id);if(m){m.gestoria=v;save()}}
function deleteBank(id){if(confirm("¿Borrar este ingreso al banco?")){data.bank=data.bank.filter(x=>x.id!=id);save()}}
function pdfWinAnsiBytes(text){
 const map={"€":128,"‚":130,"ƒ":131,"„":132,"…":133,"†":134,"‡":135,"ˆ":136,"‰":137,"Š":138,"‹":139,"Œ":140,"Ž":142,"‘":145,"’":146,"“":147,"”":148,"•":149,"–":150,"—":151,"˜":152,"™":153,"š":154,"›":155,"œ":156,"ž":158,"Ÿ":159};
 let out=[];for(const ch of String(text)){let cp=ch.codePointAt(0);if(map[ch]!=null)out.push(map[ch]);else if(cp<=255)out.push(cp);else out.push(63)}return out
}
function pdfEscapeBytes(bytes){let out=[];for(const b of bytes){if(b===40||b===41||b===92){out.push(92,b)}else if(b===10||b===13){out.push(32)}else out.push(b)}return out}
function pdfTextCmd(text,x,y,size=10,bold=false){let b=pdfEscapeBytes(pdfWinAnsiBytes(text));return {head:`BT /${bold?'F2':'F1'} ${size} Tf ${x} ${y} Td (`,bytes:b,tail:`) Tj ET\n`}}
function makeMonthlyPdfBytes(){
 let y=currentYear(),m=+document.getElementById("reportMonth").value,rows=monthlyIncomeRows();
 let tt=0,tb=0;
 const pageStreams=[];let cmds=[],cy=790;
 function add(text,x,size=10,bold=false){cmds.push(pdfTextCmd(text,x,cy,size,bold));}
 function header(){cy=790;add(data.settings.owner||"Nombre de empresa",45,16,true);cy-=24;add(`Registro de ingresos - ${MONTHS[m-1]} ${y}`,45,12,true);cy-=30;add("Fecha",45,9,true);add("Efectivo + IVA",220,9,true);add("Base imponible",405,9,true);cy-=17;}
 function flush(){pageStreams.push(cmds);cmds=[];}
 header();
 for(const r of rows){if(cy<90){flush();header()}tt+=r.total;tb+=r.base;add(`${r.date.slice(8,10)}/${r.date.slice(5,7)}/${r.date.slice(0,4)}`,45,9);add(eur(r.total),220,9);add(eur(r.base),405,9);cy-=18;}
 if(!rows.length){add("Sin ingresos registrados en este mes.",45,10);cy-=22}else{if(cy<105){flush();header()}cy-=8;add("TOTAL MES",45,10,true);add(eur(tt),220,10,true);add(eur(tb),405,10,true);}
 flush();
 const enc=new TextEncoder();let objects=[];
 const pageCount=pageStreams.length;const font1=3+pageCount*2,font2=font1+1;
 objects[1]=enc.encode(`<< /Type /Catalog /Pages 2 0 R >>`);
 let kids=[];for(let i=0;i<pageCount;i++)kids.push(`${3+i*2} 0 R`);objects[2]=enc.encode(`<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${pageCount} >>`);
 for(let i=0;i<pageCount;i++){
   let pn=3+i*2,cn=pn+1;objects[pn]=enc.encode(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${font1} 0 R /F2 ${font2} 0 R >> >> /Contents ${cn} 0 R >>`);
   let bytes=[];for(const c of pageStreams[i]){bytes.push(...enc.encode(c.head),...c.bytes,...enc.encode(c.tail))}let prefix=enc.encode(`<< /Length ${bytes.length} >>\nstream\n`),suffix=enc.encode(`endstream`);objects[cn]=new Uint8Array([...prefix,...bytes,...suffix]);
 }
 objects[font1]=enc.encode(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`);objects[font2]=enc.encode(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`);
 let parts=[enc.encode("%PDF-1.4\n%âãÏÓ\n")],offsets=[0],pos=parts[0].length;for(let i=1;i<objects.length;i++){offsets[i]=pos;let h=enc.encode(`${i} 0 obj\n`),t=enc.encode(`\nendobj\n`);parts.push(h,objects[i],t);pos+=h.length+objects[i].length+t.length}let xref=pos;let xs=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;for(let i=1;i<objects.length;i++)xs+=String(offsets[i]).padStart(10,"0")+" 00000 n \n";xs+=`trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;parts.push(enc.encode(xs));return new Blob(parts,{type:"application/pdf"})
}
function viewMonthlyPDF(){
 buildMonthlyReport();
 let y=currentYear(),m=+document.getElementById("reportMonth").value,rows=monthlyIncomeRows(),tt=0,tb=0;
 let trs=rows.map(r=>{tt+=r.total;tb+=r.base;return `<tr><td>${r.date.slice(8,10)}/${r.date.slice(5,7)}/${r.date.slice(0,4)}</td><td>${eur(r.total)}</td><td>${eur(r.base)}</td></tr>`}).join("");
 if(!rows.length)trs='<tr><td colspan="3">Sin ingresos registrados</td></tr>';
 else trs+=`<tr><th>TOTAL MES</th><th>${eur(tt)}</th><th>${eur(tb)}</th></tr>`;
 let old=document.getElementById("pdfPreviewOverlay");if(old)old.remove();
 let o=document.createElement("div");o.id="pdfPreviewOverlay";o.style.cssText="position:fixed;inset:0;z-index:99999;background:#e9edf2;overflow:auto;padding:14px";
 o.innerHTML=`<div style="max-width:820px;margin:0 auto"><div style="position:sticky;top:0;z-index:2;display:flex;gap:8px;padding:8px 0;background:#e9edf2"><button class="primary" style="flex:1" onclick="document.getElementById('pdfPreviewOverlay').remove()">← Volver</button><button class="secondary" style="flex:1;background:#111;color:#fff;border-color:#111" onclick="printMonthlyReport()">🖨️ Imprimir / Guardar PDF</button></div><div id="pdfPreviewPage" style="background:#fff;color:#111;min-height:75vh;padding:28px 20px;box-shadow:0 2px 12px #0002"><h2 style="margin:0 0 5px;color:#111">${escapeHTML(data.settings.owner||"Nombre de empresa")}</h2><div style="margin-bottom:22px;color:#555">Registro de ingresos · ${MONTHS[m-1]} ${y}</div><table class="reportTable" style="width:100%;color:#111"><tr><th>Fecha</th><th>Efectivo + IVA</th><th>Base imponible</th></tr>${trs}</table></div></div>`;
 document.body.appendChild(o);
}
async function blobToDataURL(blob){
 return await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob)})
}
async function downloadFileCompat(blob,name){
 // En Android WebView los enlaces blob: pueden no llegar al gestor de descargas.
 // Un data: URL conserva el archivo dentro del documento y evita esa limitación.
 const href=await blobToDataURL(blob);
 if(window.AndroidFiles){window.AndroidFiles.saveFile(href.split(',')[1],name,blob.type);return}
 const a=document.createElement("a");a.href=href;a.download=name;a.setAttribute("download",name);a.style.display="none";
 document.body.appendChild(a);a.click();setTimeout(()=>a.remove(),1500);
}
async function downloadMonthlyPDF(){try{buildMonthlyReport();const blob=makeMonthlyPdfBytes(),m=+document.getElementById("reportMonth").value,y=currentYear(),name=`Ingresos-${MONTHS[m-1].toLowerCase()}-${y}.pdf`;await downloadFileCompat(blob,name)}catch(e){console.error(e);alert("No se pudo descargar el PDF en este dispositivo.")}}
async function saveMonthlyPDF(){
 try{
  buildMonthlyReport();
  const blob=makeMonthlyPdfBytes(),m=+document.getElementById("reportMonth").value,y=currentYear(),name=`Ingresos-${MONTHS[m-1].toLowerCase()}-${y}.pdf`;
  const file=new File([blob],name,{type:"application/pdf"});
  if(navigator.share && (!navigator.canShare || navigator.canShare({files:[file]}))){await navigator.share({files:[file],title:name});return}
  await downloadFileCompat(blob,name);
  alert("Tu Android no ofrece el selector de compartir desde esta WebView. El PDF se ha enviado al gestor de descargas.");
 }catch(e){if(e&&e.name==="AbortError")return;console.error(e);alert("No se pudo abrir el selector para guardar/compartir. Prueba con Descargar PDF.")}
}
function printMonthlyReport(){
 buildMonthlyReport();
 const preview=document.getElementById("pdfPreviewOverlay");
 if(preview) preview.style.display="none";
 setTimeout(()=>{
   try{
     if(window.AndroidPrint && typeof window.AndroidPrint.printPage === "function"){
       window.AndroidPrint.printPage();
     }else{
       window.print();
     }
   } finally {
     if(preview) setTimeout(()=>preview.style.display="block",800);
   }
 },150);
}
function saveSettings(){data.settings.owner=owner.value.trim();data.settings.irpf=+irpf.value||20;save();alert("Guardado")}
async function exportData(){try{const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});await downloadFileCompat(blob,"mis_cuentas_pro_copia.json")}catch(e){console.error(e);alert("No se pudo exportar la copia en este dispositivo.")}}
function importData(e){let f=e.target.files[0];if(!f)return;let r=new FileReader();r.onload=()=>{try{const imported=MCPStore.validate(JSON.parse(r.result));if(!confirm("¿Sustituir los datos actuales por esta copia? Se conservará una copia de recuperación."))return;MCPStore.backup(data,"antes_importar");data=imported;save();owner.value=data.settings?.owner||"";irpf.value=data.settings?.irpf??20;alert("Copia importada")}catch{alert("Archivo no válido")}};r.readAsText(f)}
init();
async function hashPin(v){let b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function setPin(){let v=(pinNew.value||"").trim();if(!/^\d{4,8}$/.test(v)){alert("El PIN debe tener entre 4 y 8 cifras.");return}localStorage.setItem("mcp_pin_hash",await hashPin(v));pinNew.value="";alert("PIN activado en este dispositivo.")}
function removePin(){if(confirm("¿Quitar la protección por PIN?")){localStorage.removeItem("mcp_pin_hash");alert("PIN desactivado.")}}
async function unlockApp(){if(await hashPin(pinEntry.value)===localStorage.getItem("mcp_pin_hash")){lockScreen.style.display="none";pinEntry.value="";pinError.textContent=""}else pinError.textContent="PIN incorrecto."}
window.addEventListener("load",()=>{if(localStorage.getItem("mcp_pin_hash"))lockScreen.style.display="flex";if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{})});


// Integración con el botón/gesto Atrás de Android.
// Conserva una entrada de historial dentro de la app para poder preguntar antes de cerrarla.
function initAndroidBackNavigation(){
 history.replaceState({mcp:true,page:"exit"},"",location.href);
 history.pushState({mcp:true,page:"home"},"",location.href);
 window.addEventListener("popstate",()=>{
   const preview=document.getElementById("pdfPreviewOverlay");
   if(preview){preview.remove();history.pushState({mcp:true,page:document.querySelector(".page.active")?.id||"home"},"",location.href);return}
   const active=document.querySelector(".page.active")?.id||"home";
   if(active!=="home"){
     handlingAndroidBack=true;activatePage("home");handlingAndroidBack=false;
     history.pushState({mcp:true,page:"home"},"",location.href);
     return;
   }
   if(confirm("¿Quieres salir de Mis Cuentas PRO?")){
     history.back();
   }else{
     history.pushState({mcp:true,page:"home"},"",location.href);
   }
 });
}
initAndroidBackNavigation();

async function shareApp(){
 const info={title:"Mis Cuentas PRO",text:"Mis Cuentas PRO - control de ingresos, gastos, IVA, IRPF, gestoría y caja/banco.",url:window.AndroidPrint?"https://mis-cuentas-pro-b565d.web.app/":location.origin+"/"};
 try{
   if(navigator.share){await navigator.share(info)}
   else if(navigator.clipboard){await navigator.clipboard.writeText(info.url);alert("Enlace copiado. Ya puedes pegarlo en WhatsApp.")}
   else{prompt("Copia este enlace:",info.url)}
 }catch(e){}
}

function updateFabForPage(){
 const active=document.querySelector(".page.active");
 const id=active?active.id:"home";
 document.body.classList.toggle("hideFab",!(id==="home"||id==="moves"));
}
document.addEventListener("click",()=>setTimeout(updateFabForPage,0));
window.addEventListener("load",updateFabForPage);

function newRecordId(){let id;do{id=Date.now()*1000+crypto.getRandomValues(new Uint32Array(1))[0]%1000}while(data.movements.some(x=>x.id===id)||data.bank.some(x=>x.id===id));return id}
