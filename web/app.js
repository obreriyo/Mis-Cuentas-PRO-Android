const MONTHS=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const KEY="mis_cuentas_pro_web_v1";
const escapeText=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function irpfRate(){return Number.isFinite(data.settings.irpf)?data.settings.irpf:20}
let data=CAStore.open(null);
data.movements=data.movements||[];data.bank=data.bank||[];data.settings=data.settings||{owner:"",irpf:20};data.nonworking=data.nonworking||[];data.gestIncome=data.gestIncome||{};
data.movements.forEach(m=>{if(m.gestoria==null)m.gestoria=false;if(m.type==="Gasto"){if(m.category==null)m.category="otros";if(m.irpfDeductible==null)m.irpfDeductible=true;if(m.vatDeductible==null)m.vatDeductible=true}});
const eur=n=>Number(n||0).toLocaleString("es-ES",{minimumFractionDigits:2,maximumFractionDigits:2})+" €";
function save(){try{CAStore.save(data);render();if(window.scheduleSync)scheduleSync()}catch(e){alert('No se pudo guardar: '+e.message+'. Exporta una copia antes de cerrar.');throw e}}
function localToday(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function currentYear(){return +document.getElementById("year").value}
let handlingAndroidBack=false;let pageTrail=[];
function activatePage(id,b){
 document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));
 document.getElementById(id).classList.add("active");
 document.querySelectorAll(".nav button").forEach(x=>x.classList.remove("active"));
 if(b)b.classList.add("active"); else {let btn=document.querySelector(`.nav button[onclick*="show('${id}'"]`);if(btn)btn.classList.add("active")}
 render();updateFabForPage();window.scrollTo(0,0);
}
function show(id,b){
 const previous=document.querySelector(".page.active")?.id||"home";
 if(!handlingAndroidBack&&previous!==id){if(id==="home")pageTrail=[];else pageTrail.push(previous)}
 if(previous==="moves"&&id!=="moves")window.CAWorkCalendarUI?.leaveDays();
 activatePage(id,b);
 if(!handlingAndroidBack && history.state?.page!==id) history.pushState({ca:true,page:id},"",location.href);
}
function init(){
 let y=new Date().getFullYear(), sel=document.getElementById("year"),years=[...data.movements.map(x=>+String(x.date).slice(0,4)),...data.bank.map(x=>+String(x.date).slice(0,4))].filter(Number.isFinite),min=Math.min(y-10,...years),max=Math.max(y+20,...years);for(let n=min;n<=max;n++)sel.add(new Option(n,n));sel.value=y;sel.onchange=render;
 owner.value=data.settings.owner||"";irpf.value=data.settings.irpf??20;
 date.value=localToday();bankDate.value=date.value;
 months.innerHTML=MONTHS.map((m,i)=>`<button onclick="renderMonth(${i+1})">${m}</button>`).join("");
 [reportMonth,gestMonth,benefitMonth].forEach(sel=>{sel.innerHTML=MONTHS.map((m,i)=>`<option value="${i+1}">${m}</option>`).join("");sel.value=new Date().getMonth()+1});render()
}
function vals(m){let t=+m.total||0,r=+m.vat||0,base=t/(1+r/100);return{base,vat:t-base,total:t}}
function render(){
 let y=currentYear(), ms=data.movements.filter(m=>+m.date.slice(0,4)==y),inc=ms.filter(m=>m.type=="Ingreso").reduce((a,m)=>a+(+m.total||0),0),exp=ms.filter(m=>m.type=="Gasto").reduce((a,m)=>a+(+m.total||0),0);
 income.textContent="+"+eur(inc);expense.textContent="-"+eur(exp);balance.textContent=eur(inc-exp);
 recent.innerHTML=ms.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,3).map(m=>movementHTML(m)).join("")||'<div class="panel small">Todavía no hay movimientos.</div>';
 renderQuarters();renderCash();renderBenefits();document.getElementById('annualPayments').innerHTML=paymentSummaryHTML(selectedIncome(y),'Cobros del año '+y)
}
function paymentSummaryHTML(movements,title='Cobrado por forma de pago'){
 const totals=CAPayments.split(movements);
 return `<h3>${title}</h3><table class="reportTable"><tr><th>Forma de cobro</th><th>Importe (IVA incluido)</th></tr>${Object.entries(CAPayments.labels).filter(([key])=>Math.round(totals[key]*100)!==0).map(([key,label])=>`<tr><td>${label}</td><td>${eur(totals[key])}</td></tr>`).join('')}<tr><th>Total cobrado</th><th>${eur(totals.total)}</th></tr></table>${totals.unspecifiedCount?'<p class="small">Los ingresos sin forma de cobro se muestran como Sin especificar. Puedes clasificarlos en Movimientos.</p>':''}`;
}
function selectedIncome(y,m){return data.movements.filter(x=>x.type==='Ingreso'&&Number(x.date.slice(0,4))===y&&(m==null||Number(x.date.slice(5,7))===m))}
function reportedIncome(y,m){return selectedIncome(y,m)}
function setPaymentMethod(id,value){
 if(!Object.hasOwn(CAPayments.labels,value))return;
 const movement=data.movements.find(x=>x.id===id&&x.type==='Ingreso');if(!movement)return;if(movement.tpvSaleId||movement.receivableId)return alert('Gestiona este cobro desde su sección de origen.');
 const previous=movement.paymentMethod;movement.paymentMethod=value;
 try{save();const month=Number(movement.date.slice(5,7));if(document.getElementById('moves').classList.contains('active'))renderMonth(month);buildMonthlyReport()}catch(e){if(previous==null)delete movement.paymentMethod;else movement.paymentMethod=previous;render()}
}
function movementHTML(m){
 let cat=m.type==="Gasto"?categoryName(m.category):"";
 return `<div class="movement"><div class="ico">${m.type==="Ingreso"?"↓":"↑"}</div><div><div class="mname">${escapeText(m.concept||m.type)}</div><div class="sub">${m.date}${cat?` · ${cat}`:""} · IVA ${m.vat||0}%${m.type==="Ingreso"?` · ${CAPayments.labels[CAPayments.method(m)]}`:""}</div>${m.type==="Ingreso"&&!m.tpvSaleId&&!m.receivableId?`<label class="small" for="payment-${m.id}">Forma de cobro</label><select id="payment-${m.id}" aria-label="Forma de cobro del ingreso ${m.id}" onchange="setPaymentMethod(${m.id},this.value)" style="font-size:14px;padding:8px;margin:4px 0">${Object.entries(CAPayments.labels).map(([key,label])=>`<option value="${key}" ${CAPayments.method(m)===key?'selected':''}>${label}</option>`).join('')}</select>`:''}<div class="actions">${!m.tpvSaleId&&!m.receivableId&&!m.payrollId?`<button class="tiny" onclick="editMovement(${m.id})">Editar</button>`:''}<button class="tiny danger" onclick="deleteMove(${m.id})">Borrar</button></div></div><div class="amt ${(m.type==="Ingreso"?m.total:-m.total)>=0?"green":"red"}">${(m.type==="Ingreso"?m.total:-m.total)>=0?"+":"−"}${eur(Math.abs(m.total))}</div></div>`}

function deleteMove(id){if(data.movements.find(x=>x.id==id)?.tpvSaleId)return alert("Gestiona esta venta desde TPV → Historial.");if(data.movements.find(x=>x.id==id)?.receivableId)return alert("Gestiona este ingreso desde Cobros pendientes para mantener su vínculo.");if(data.movements.find(x=>x.id==id)?.payrollId)return alert("Gestiona este coste desde Empleados para evitar inconsistencias.");if(confirm("¿Borrar este movimiento?")){data.movements=data.movements.filter(x=>x.id!=id);save()}}
const CATEGORY_NAMES={material:"Compras / materiales",gestoria:"Gestoría / servicios profesionales",autonomos:"Cuota de autónomos (RETA)",suministros:"Suministros",alquiler:"Alquiler",seguros:"Seguros",transporte:"Vehículo / transporte",formacion:"Formación",otros:"Otros gastos"};
function categoryName(v){return CATEGORY_NAMES[v]||"Otros gastos"}
function syncMovementForm(){let isExpense=type.value==="Gasto";document.getElementById("paymentFields").hidden=isExpense;expenseFiscalFields.style.display=isExpense?"block":"none";deductibleFields.style.display=isExpense?"block":"none";if(isExpense)applyExpenseCategory();else{vat.disabled=false;vatDeductible.checked=false;irpfDeductible.checked=false;fiscalHint.textContent=""}}
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
function dateForSelectedYear(){let now=new Date(),y=currentYear(),m=now.getMonth()+1,d=now.getDate(),last=new Date(y,m,0).getDate();d=Math.min(d,last);return `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`}
function openAdd(){document.getElementById("movementEditId").value="";document.getElementById("movementTitle").textContent="Nuevo movimiento";concept.value="";total.value="";date.value=dateForSelectedYear();type.value="Ingreso";document.getElementById("paymentMethod").value="";vat.value=21;withholding.value=0;syncMovementForm();dlg.showModal()}
type.addEventListener("change",syncMovementForm);
function editMovement(id){const m=data.movements.find(x=>x.id===id);if(!m)return;if(m.tpvSaleId||m.receivableId||m.payrollId)return alert('Este registro se modifica desde su sección de origen.');openAdd();document.getElementById('movementEditId').value=m.id;document.getElementById('movementTitle').textContent='Editar movimiento';type.value=m.type;syncMovementForm();date.value=m.date;concept.value=m.concept;total.value=m.total;vat.disabled=false;vat.value=m.vat;withholding.value=m.withholding??0;document.getElementById('paymentMethod').value=m.paymentMethod??'unspecified';if(m.type==='Gasto'){expenseCategory.value=m.category||'otros';irpfDeductible.checked=m.irpfDeductible!==false;vatDeductible.checked=m.vatDeductible!==false}}
function addMovement(){const editId=Number(document.getElementById('movementEditId').value),old=editId?data.movements.find(x=>x.id===editId):null;if(editId&&(!old||old.tpvSaleId||old.receivableId||old.payrollId))return alert('El movimiento ya no admite edición.');const n=Number(String(total.value).trim().replace(',','.')),v=Number(vat.value),ret=Number(withholding.value),isExpense=type.value==='Gasto',method=document.getElementById('paymentMethod').value;if(!CATPV.validDate(date.value)||!Number.isFinite(n)||n===0||!Number.isFinite(v)||v<0||v>100||!Number.isFinite(ret)||ret<0||ret>100)return alert('Revisa fecha, importe, IVA y retención.');if(!isExpense&&!['cash','card','transfer'].includes(method)&&!(old?.paymentMethod==null&&method==='unspecified'))return alert('Elige cómo has cobrado: efectivo, tarjeta o transferencia.');const c=isExpense?expenseCategory.value:null,entry={id:old?.id||Date.now(),type:type.value,date:date.value,concept:concept.value.trim(),total:n,vat:c==='autonomos'?0:v,withholding:ret,gestoria:old?.gestoria??false,...(!isExpense?{paymentMethod:method}:{}),category:c,irpfDeductible:isExpense?irpfDeductible.checked:false,vatDeductible:isExpense?vatDeductible.checked:false};if(old&&!confirm('¿Guardar los cambios de este movimiento?'))return;try{const next=structuredClone(data);if(old)next.movements[next.movements.findIndex(x=>x.id===editId)]=entry;else{while(next.movements.some(x=>x.id===entry.id))entry.id++;next.movements.push(entry)}CAStore.validate(next);CAStore.save(next);data=next;dlg.close();render();if(window.scheduleSync)scheduleSync();if(document.getElementById('moves').classList.contains('active'))renderMonth(Number(entry.date.slice(5,7)));concept.value='';total.value='';document.getElementById('movementEditId').value=''}catch(e){alert('No se pudo guardar: '+e.message)}}
function renderMonth(m,preserveScroll=false){
 const scrollX=window.scrollX,scrollY=window.scrollY;
 if(!preserveScroll)show("moves",document.querySelectorAll(".nav button")[1]);let y=currentYear(),arr=data.movements.filter(x=>+x.date.slice(0,4)==y&&+x.date.slice(5,7)==m).sort((a,b)=>b.date.localeCompare(a.date));
 let days=new Date(y,m,0).getDate(),nw=data.nonworking.filter(d=>d.startsWith(`${y}-${String(m).padStart(2,"0")}`)).length;
 let first=(new Date(y,m-1,1).getDay()+6)%7;
 let weekdays=["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];
 let calendar=weekdays.map(x=>`<div class="weekday">${x}</div>`).join("")+Array.from({length:first},()=>'<div class="empty"></div>').join("")+Array.from({length:days},(_,i)=>{let d=`${y}-${String(m).padStart(2,"0")}-${String(i+1).padStart(2,"0")}`,off=data.nonworking.includes(d)||(data.tpv?.workCalendar?.enabled&&data.tpv.workCalendar.closedDates.includes(d));return `<button onclick="toggleDay('${d}')" style="${off?'background:#ffe9eb;color:#d94d55;text-decoration:line-through;border:1px solid #f3b8bd':'border:1px solid transparent'}">${i+1}${off?' ✕':''}</button>`}).join("");
 monthList.innerHTML=`<div class="section">${MONTHS[m-1]} ${y}</div><div class="panel"><b>Calendario laboral</b><p class="small">Pulsa directamente sobre cualquier día para marcarlo como no trabajado. Vuelve a pulsarlo para recuperarlo.</p><div class="small" style="margin-bottom:10px"><span class="badge">✓ Trabajado</span> <span class="badge" style="background:#ffe9eb;color:#d94d55">✕ No trabajado (${nw})</span></div><div class="workcalendar">${calendar}</div></div>`+(arr.map(movementHTML).join("")||'<div class="panel small">Sin movimientos este mes.</div>')
 if(preserveScroll){window.scrollTo(scrollX,scrollY);requestAnimationFrame(()=>{if(document.querySelector(".page.active")?.id==="moves")window.scrollTo(scrollX,scrollY)})}
}
function toggleDay(d){let i=data.nonworking.indexOf(d),c=data.tpv?.workCalendar,legacy=c?.enabled&&c.closedDates.includes(d);if(i>=0||legacy){if(i>=0)data.nonworking.splice(i,1);if(c)c.closedDates=c.closedDates.filter(x=>x!==d)}else{data.nonworking.push(d)}save();renderMonth(+d.slice(5,7),true)}
function renderQuarters(){
 let y=currentYear(),p=irpfRate(),out="";
 for(let q=0;q<4;q++){
  let a=data.movements.filter(x=>+x.date.slice(0,4)==y&&Math.floor((+x.date.slice(5,7)-1)/3)==q),ib=0,eb=0,iv=0,ev=0,ret=0;
  a.forEach(x=>{let v=vals(x);if(x.type==="Ingreso"){ib+=v.base;iv+=v.vat;ret+=v.base*(+x.withholding||0)/100}else{if(x.irpfDeductible!==false)eb+=v.base;if(x.vatDeductible!==false)ev+=v.vat}});
  let iva=iv-ev,irpf=Math.max(0,(ib-eb)*p/100-ret);
  out+=`<div class="movement"><div class="ico">${q+1}T</div><div><div class="mname">Trimestre ${q+1}</div><div class="sub">IVA estimado ${eur(iva)}</div></div><div class="amt">${eur(irpf)}<div class="small">IRPF</div></div></div>`}
 quarters.innerHTML=out}

function monthlyBenefit(y,m){
 let a=data.movements.filter(x=>+x.date.slice(0,4)==y&&+x.date.slice(5,7)==m),p=irpfRate(),inc=0,gas=0,ib=0,eb=0,iv=0,ev=0,ret=0;
 a.forEach(x=>{let v=vals(x);if(x.type==="Ingreso"){inc+=+x.total||0;ib+=v.base;iv+=v.vat;ret+=v.base*(+x.withholding||0)/100}else{gas+=+x.total||0;if(x.irpfDeductible!==false)eb+=v.base;if(x.vatDeductible!==false)ev+=v.vat}});
 let bruto=inc-gas,iva=Math.max(0,iv-ev),irpf=Math.max(0,(ib-eb)*p/100-ret),hacienda=iva+irpf;
 return{inc,gas,bruto,iva,irpf,hacienda,neto:bruto-hacienda}}

function renderBenefits(){
 let b=monthlyBenefit(currentYear(),+benefitMonth.value),m=+benefitMonth.value;
 benefits.innerHTML=`<div style="border-top:1px solid var(--line);padding:14px 0"><b>${MONTHS[m-1]} ${currentYear()}</b><div class="small" style="margin-top:8px;line-height:1.7">Ingresos: <b>${eur(b.inc)}</b><br>Gastos: <b>${eur(b.gas)}</b><br>Beneficio antes de impuestos: <b>${eur(b.bruto)}</b><br>Hacienda estimada: <b>${eur(b.hacienda)}</b> (IVA ${eur(b.iva)} + IRPF ${eur(b.irpf)})<br><b>Beneficio neto estimado: ${eur(b.neto)}</b></div></div>`+paymentSummaryHTML(selectedIncome(currentYear(),m))}

function addBank(){let n=parseFloat(bankAmount.value.replace(",","."));if(!bankDate.value||!n)return alert("Indica fecha e importe.");data.bank.push({id:Date.now(),date:bankDate.value,amount:n});bankAmount.value="";save()}
function renderCash(){
 const y=currentYear(),months=CAPayments.cashYear(data.movements,data.bank,y);
 cashSummary.innerHTML=months.map(r=>{
 const monthIncome=CAPayments.split(selectedIncome(y,r.month));
 return `<div class="panel"><b>${MONTHS[r.month-1]}</b><div class="small" style="line-height:1.8;margin-top:8px">Cobrado en efectivo: ${eur(monthIncome.cash)}<br>Cobrado con tarjeta: ${eur(r.card)}<br>Cobrado por transferencia: ${eur(r.transfer)}<br>Sin especificar: ${eur(r.unspecified)}<br>Efectivo llevado al banco: ${eur(r.deposit)}<br><b>${r.unknownCount?'Caja provisional':'Caja acumulada'}: ${eur(r.unknownCount?r.provisionalCash:r.cash)}</b>${r.unknownCount?`<br>Incluye ${eur(r.unknown)} sin forma de cobro asignada; clasifica esos ingresos para conocer el efectivo.`:''}<br>Entradas brutas al banco acumuladas: ${eur(r.bankEntries)}</div></div>`;
 }).join('');
 const deposited=data.bank.filter(x=>Number(x.date.slice(0,4))===y).map(x=>({...x,kind:'deposit'}));
 const direct=selectedIncome(y).filter(x=>['card','transfer'].includes(CAPayments.method(x))).map(x=>({...x,amount:x.total,kind:CAPayments.method(x)}));
 bankHistory.innerHTML=[...deposited,...direct].sort((a,b)=>b.date.localeCompare(a.date)).map(x=>`<div class="movement"><div class="ico">€</div><div><div class="mname">${x.kind==='deposit'?'Efectivo llevado al banco':CAPayments.labels[x.kind]+' · cobro registrado'}</div><div class="sub">${x.date}${x.kind==='deposit'?'':' · Importe bruto; consulta el abono en tu banco'}</div></div><div class="amt">${eur(x.amount)}<div>${x.kind==='deposit'?`<button class="tiny danger" onclick="deleteBank(${x.id})">Borrar</button>`:'<span class="small">Se modifica desde Movimientos</span>'}</div></div></div>`).join('')||'<div class="panel small">Sin entradas registradas al banco.</div>';
}

function monthlyIncomeRows(){
 let y=currentYear(),m=+reportMonth.value,d={};
 data.movements.filter(x=>x.type==="Ingreso"&&+x.date.slice(0,4)==y&&+x.date.slice(5,7)==m).forEach(x=>{let v=vals(x),r=d[x.date]||(d[x.date]={date:x.date,total:0,base:0});r.total+=v.total;r.base+=v.base});
 return Object.values(d).sort((a,b)=>a.date.localeCompare(b.date))}

function buildMonthlyReport(){
 let y=currentYear(),m=+document.getElementById("reportMonth").value,arr=monthlyIncomeRows();
 let tt=0,tb=0;
 let rows=arr.map(x=>{tt+=x.total;tb+=x.base;return `<tr><td>${x.date.slice(8,10)}/${x.date.slice(5,7)}/${x.date.slice(0,4)}</td><td>${eur(x.total)}</td><td>${eur(x.base)}</td></tr>`}).join("");
 let totalRow=arr.length?`<tr><th>TOTAL MES</th><th>${eur(tt)}</th><th>${eur(tb)}</th></tr>`:"";
 document.getElementById("monthlyReport").innerHTML=`<h3>${escapeText(data.settings.owner||"Nombre de empresa")}</h3><div class="small" style="margin:-6px 0 14px">Registro de ingresos · ${MONTHS[m-1]} ${y}</div><table class="reportTable"><tr><th>Fecha</th><th>Total (IVA incluido)</th><th>Base imponible</th></tr>${rows||'<tr><td colspan="3">Sin ingresos registrados</td></tr>'}${totalRow}</table>`+paymentSummaryHTML(reportedIncome(y,m));
 const pa=document.getElementById("pdfActions");if(pa)pa.style.display="block";
}
function renderGestoria(){
 let y=currentYear(),m=+gestMonth.value,key=`${y}-${String(m).padStart(2,"0")}`,arr=data.movements.filter(x=>+x.date.slice(0,4)==y&&+x.date.slice(5,7)==m),inc=arr.filter(x=>x.type=="Ingreso"),gas=arr.filter(x=>x.type=="Gasto");
 gestoria.innerHTML=`<div class="check"><input type="checkbox" ${data.gestIncome[key]?"checked":""} onchange="data.gestIncome['${key}']=this.checked;save()"><b>Ingresos del mes entregados</b></div><h3>Gastos</h3>`+(gas.map(x=>`<label class="check"><input type="checkbox" ${x.gestoria?"checked":""} onchange="setGest(${x.id},this.checked)"><span>${x.date.slice(8,10)} · ${x.concept||"Gasto"} · ${eur(x.total)}</span></label>`).join("")||'<p class="small">Sin gastos este mes.</p>')
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
 function header(){cy=790;add(data.settings.owner||"Nombre de empresa",45,16,true);cy-=24;add(`Registro de ingresos - ${MONTHS[m-1]} ${y}`,45,12,true);cy-=30;add("Fecha",45,9,true);add("Total (IVA incluido)",220,9,true);add("Base imponible",405,9,true);cy-=17;}
 function flush(){pageStreams.push(cmds);cmds=[];}
 header();
 for(const r of rows){if(cy<90){flush();header()}tt+=r.total;tb+=r.base;add(`${r.date.slice(8,10)}/${r.date.slice(5,7)}/${r.date.slice(0,4)}`,45,9);add(eur(r.total),220,9);add(eur(r.base),405,9);cy-=18;}
 if(!rows.length){add("Sin ingresos registrados en este mes.",45,10);cy-=22}else{if(cy<105){flush();header()}cy-=8;add("TOTAL MES",45,10,true);add(eur(tt),220,10,true);add(eur(tb),405,10,true);}
 if(cy<190){flush();header()}
 cy-=34;add("Desglose por forma de cobro (IVA incluido)",45,11,true);cy-=22;
 const breakdown=CAPayments.split(reportedIncome(y,m));
 for(const [key,label] of Object.entries(CAPayments.labels)){if(Math.round(breakdown[key]*100)===0)continue;add(label,45,10);add(eur(breakdown[key]),300,10);cy-=20}
 add("TOTAL COBRADO",45,10,true);add(eur(breakdown.total),300,10,true);cy-=20;
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
 const old=document.getElementById('pdfPreviewOverlay');if(old)old.remove();
 const o=document.createElement('div');o.id='pdfPreviewOverlay';o.style.cssText='position:fixed;inset:0;z-index:99999;background:#e9edf2;overflow:auto;padding:14px';
 o.innerHTML=`<div style="max-width:820px;margin:0 auto"><div style="position:sticky;top:0;z-index:2;display:flex;gap:8px;padding:8px 0;background:#e9edf2"><button class="primary" style="flex:1" onclick="document.getElementById('pdfPreviewOverlay').remove()">Volver</button><button class="secondary" style="flex:1" onclick="saveMonthlyPDF()">Guardar / compartir</button><button class="secondary" style="flex:1" onclick="printMonthlyReport()">Imprimir</button></div><div id="pdfPreviewPage" style="background:#fff;color:#111;min-height:75vh;padding:28px 20px">${document.getElementById('monthlyReport').innerHTML}</div></div>`;
 document.body.appendChild(o);
}

async function blobToDataURL(blob){
 return await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob)})
}
async function downloadFileCompat(blob,name){
 // En Android WebView los enlaces blob: pueden no llegar al gestor de descargas.
 // Un data: URL conserva el archivo dentro del documento y evita esa limitación.
 const href=await blobToDataURL(blob);
 if(window.AndroidFiles && typeof window.AndroidFiles.saveFile==="function"){window.AndroidFiles.saveFile(href.split(',')[1],name,blob.type);return}
 const a=document.createElement("a");a.href=href;a.download=name;a.setAttribute("download",name);a.style.display="none";
 document.body.appendChild(a);a.click();setTimeout(()=>a.remove(),1500);
}
async function downloadMonthlyPDF(){try{buildMonthlyReport();const blob=makeMonthlyPdfBytes(),m=+document.getElementById("reportMonth").value,y=currentYear(),name=`Ingresos-${MONTHS[m-1].toLowerCase()}-${y}.pdf`;await downloadFileCompat(blob,name)}catch(e){console.error(e);alert("No se pudo descargar el PDF en este dispositivo.")}}
async function saveMonthlyPDF(){
 try{
  buildMonthlyReport();
  const blob=makeMonthlyPdfBytes(),m=+document.getElementById("reportMonth").value,y=currentYear(),name=`Ingresos-${MONTHS[m-1].toLowerCase()}-${y}.pdf`;
  if(window.AndroidFiles && typeof window.AndroidFiles.saveFile==="function"){await downloadFileCompat(blob,name);return}
  const file=new File([blob],name,{type:"application/pdf"});
  if(navigator.share && (!navigator.canShare || navigator.canShare({files:[file]}))){await navigator.share({files:[file],title:name});return}
  await downloadFileCompat(blob,name);
 }catch(e){if(e&&e.name==="AbortError")return;console.error(e);alert("No se pudo guardar/compartir el PDF.")}
}
function printMonthlyReport(){
 buildMonthlyReport();
 const preview=document.getElementById("pdfPreviewOverlay");
 if(preview)preview.style.display="none";
 setTimeout(()=>{
  try{if(window.AndroidPrint&&typeof window.AndroidPrint.printPage==="function")window.AndroidPrint.printPage();else window.print()}
  finally{if(preview)setTimeout(()=>preview.style.display="block",800)}
 },150);
}
function saveSettings(){const rate=Number(irpf.value);if(!irpf.value.trim()||!Number.isFinite(rate)||rate<0||rate>100)return alert('Indica un IRPF entre 0 y 100 %.');try{const next=structuredClone(data);next.settings.owner=owner.value.trim();next.settings.irpf=rate;CAStore.save(next);data=next;render();if(window.scheduleSync)scheduleSync();alert('Guardado')}catch(e){alert('No se pudo guardar: '+e.message)}}
async function exportData(){try{const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});await downloadFileCompat(blob,"control_autonomo_copia.json")}catch(e){console.error(e);alert("No se pudo exportar la copia en este dispositivo.")}}
function importData(e){let f=e.target.files[0];if(!f)return;let r=new FileReader();r.onload=()=>{try{const imported=CAStore.validate(JSON.parse(r.result));if(!confirm("¿Sustituir los datos actuales por esta copia? Se conservará una copia de recuperación."))return;CAStore.backup(data,"antes_importar");data=imported;save();owner.value=data.settings?.owner||"";irpf.value=data.settings?.irpf??20;alert("Copia importada")}catch{alert("Archivo no válido")}};r.readAsText(f)}
init();
async function hashPin(v){let b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function setPin(){let v=(pinNew.value||"").trim();if(!/^\d{4,8}$/.test(v)){alert("El PIN debe tener entre 4 y 8 cifras.");return}localStorage.setItem("mcp_pin_hash",await hashPin(v));pinNew.value="";alert("PIN activado en este dispositivo.")}
function removePin(){if(confirm("¿Quitar la protección por PIN?")){localStorage.removeItem("mcp_pin_hash");alert("PIN desactivado.")}}
async function unlockApp(){if(await hashPin(pinEntry.value)===localStorage.getItem("mcp_pin_hash")){lockScreen.style.display="none";pinEntry.value="";pinError.textContent=""}else pinError.textContent="PIN incorrecto."}
window.addEventListener("load",()=>{if(localStorage.getItem("mcp_pin_hash"))lockScreen.style.display="flex";if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{})});


// Integración con el botón/gesto Atrás de Android.
// Conserva una entrada de historial dentro de la app para poder preguntar antes de cerrarla.
function returnToPreviousPage(){const active=document.querySelector('.page.active')?.id||'home';if(active==='home')return false;const previous=pageTrail.pop()||'home';if(active==='moves')window.CAWorkCalendarUI?.leaveDays();handlingAndroidBack=true;activatePage(previous);handlingAndroidBack=false;return true}
function initAndroidBackNavigation(){
 history.replaceState({ca:true,page:"exit"},"",location.href);
 history.pushState({ca:true,page:"home"},"",location.href);
 window.addEventListener("popstate",()=>{
   const preview=document.getElementById("pdfPreviewOverlay");
   if(preview){preview.remove();history.pushState({ca:true,page:document.querySelector(".page.active")?.id||"home"},"",location.href);return}
   const modal=document.querySelector("#dlg[open],#stockDialog[open],#manualSaleDialog[open],#collectDialog[open],#completeReportDialog[open],#tpvDetailDialog[open],#tpvPaymentDialog[open],#workCalendarDialog[open],#appointmentCalendarDialog[open]");if(modal){modal.close();history.pushState({ca:true,page:document.querySelector(".page.active")?.id||"home"},"",location.href);return;}
   const active=document.querySelector(".page.active")?.id||"home";
   if(active!=="home"){
     const previous=pageTrail.pop()||"home";if(active==="moves")window.CAWorkCalendarUI?.leaveDays();
     handlingAndroidBack=true;activatePage(previous);handlingAndroidBack=false;
     history.pushState({ca:true,page:previous},"",location.href);
     return;
   }
   if(confirm("¿Quieres salir de Mis Cuentas PRO?")){
     history.back();
   }else{
     history.pushState({ca:true,page:"home"},"",location.href);
   }
 });
}
initAndroidBackNavigation();

async function shareApp(){
 const info={title:"Mis Cuentas PRO",text:"Mis Cuentas PRO - control de ingresos, gastos, IVA, IRPF, gestoría y caja/banco.",url:location.origin+"/"};
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

