'use strict';
const firebaseConfig={apiKey:'AIzaSyDgPzSN0OKw84QF_nubKfkrmfAr4MYyb7o',authDomain:'mis-cuentas-pro-b565d.firebaseapp.com',projectId:'mis-cuentas-pro-b565d',storageBucket:'mis-cuentas-pro-b565d.firebasestorage.app',messagingSenderId:'1056054862154',appId:'1:1056054862154:web:b8ea9e7db485ad101ee1b3'};
const $=id=>document.getElementById(id);
let auth,db,cloudUser=null,busy=false,timer,lastRead=0,conflict=null,authReady=false;
function cloudStatus(text){$('syncStatus').textContent=text}
function refreshAccountData(){
 data=CAStore.validate(CAStore.envelope.data);
 globalThis.CABackups?.resetSnapshot();
 owner.value=data.settings.owner;irpf.value=data.settings.irpf;
 for(const id of ['monthList','monthlyReport','gestoria'])$(id).innerHTML='';
 $('pdfActions').style.display='none';$('pdfPreviewOverlay')?.remove();
 render();
}
function deferDraftSync(){
 cloudStatus('Sincronización pendiente: guarda los formularios o descártalos para recibir cambios de la nube.');
 const button=document.createElement('button');button.className='secondary';button.textContent='Descartar formularios sin guardar';button.onclick=()=>{if(!confirm('¿Descartar los formularios y el carrito sin guardar? Los registros ya guardados se conservan.'))return;globalThis.CABackups?.resetSnapshot();render();syncCloud(true)};$('syncStatus').append(button);
}
function scheduleSync(){clearTimeout(timer);cloudStatus(cloudUser?'Guardado en este dispositivo · pendiente de sincronizar':'Guardado solo en este dispositivo');timer=setTimeout(()=>syncCloud(),3000)}
function friendlyError(e){
 const code=e.code||'';
 if(/invalid-credential|wrong-password|user-not-found/.test(code))return 'Correo o contraseña incorrectos.';
 if(/email-already-in-use/.test(code))return 'Ese correo ya tiene una cuenta. Usa Iniciar sesión.';
 if(/weak-password/.test(code))return 'Elige una contraseña de al menos 6 caracteres.';
 if(/invalid-email/.test(code))return 'Revisa el correo electrónico.';
 if(/permission-denied/.test(code))return 'Acceso denegado. Revisa las reglas de Firestore y la sesión.';
 if(/operation-not-allowed/.test(code))return 'Activa Correo/contraseña en Firebase Authentication.';
 if(/too-many-requests/.test(code))return 'Demasiados intentos. Vuelve a probar más tarde.';
 return 'No se pudo conectar. La copia local sigue disponible. '+(code||e.message||'');
}
async function accountAction(action){
 if(!authReady||busy)return;
 $('authMessage').textContent='';
 try{
  if(action==='logout'){
   if(CAStore.envelope.dirty&&!confirm('Hay cambios pendientes. Quedarán guardados en este dispositivo para esta cuenta. ¿Cerrar sesión?'))return;
   await auth.signOut();return;
  }
  const email=$('authEmail').value.trim(),password=$('authPassword').value;
  if(action==='reset'){if(!email)throw Error('Introduce tu correo electrónico.');await auth.sendPasswordResetEmail(email);$('authMessage').textContent='Si existe una cuenta con ese correo, recibirás un enlace para cambiar la contraseña. Revisa también spam.';return;}
  if(!email||!password)throw Error('Introduce correo y contraseña.');
  $('authControls').disabled=true;
  if(action==='register')await auth.createUserWithEmailAndPassword(email,password);
  else await auth.signInWithEmailAndPassword(email,password);
  $('authPassword').value='';
 }catch(e){$('authMessage').textContent=friendlyError(e)}finally{$('authControls').disabled=false}
}
function decodeCloud(payload){return typeof CASyncCodec==='object'?CASyncCodec.decode(payload):JSON.parse(payload)}
function encodeCloud(d){return typeof CASyncCodec==='object'?CASyncCodec.encode(d):JSON.stringify(d)}
function showConflict(remote){
 conflict=remote;$('conflictPanel').hidden=false;
 cloudStatus('Conflicto: móvil y PC tienen cambios. Elige qué copia conservar.');
}
async function resolveConflict(keepLocal){
 if(!conflict||busy)return;
 if(!confirm(keepLocal?'¿Sustituir la copia de la nube por esta copia local? Se guardará una copia de recuperación de la nube en este dispositivo.':'¿Usar la copia de la nube? Se guardará una copia de recuperación de tus cambios locales en este dispositivo.'))return;
 try{
  const remote=conflict;
  CAStore.backup(keepLocal?CAStore.validate(decodeCloud(remote.payload)):data,keepLocal?'nube':'local');
  CAStore.persist({...CAStore.envelope,revision:remote.revision,...(!keepLocal?{data:CAStore.validate(decodeCloud(remote.payload)),dirty:false,commitId:remote.commitId}:{dirty:true,commitId:crypto.randomUUID()})});
  conflict=null;$('conflictPanel').hidden=true;refreshAccountData();await syncCloud(true);
 }catch(e){cloudStatus(friendlyError(e))}
}
async function syncCloud(force=false){
 if(!cloudUser||busy||!authReady||conflict)return;
 if(!navigator.onLine){cloudStatus('Sin conexión · copia local disponible');return}
 if(globalThis.CAFormState?.hasDraft?.()){deferDraftSync();return}
 if(document.querySelector('dialog[open]')?.open){cloudStatus('Sincronización pendiente hasta cerrar la ventana');return}
 if(!force&&!CAStore.envelope.dirty&&Date.now()-lastRead<60000)return;
 busy=true;$('signOut').disabled=true;let completed=false;
 const uid=cloudUser.uid,ref=db.doc('users/'+uid+'/state/main');
 const before=structuredClone(CAStore.envelope);
 try{
  cloudStatus('Sincronizando…');
  if(before.dirty){
   const payload=encodeCloud(CAStore.validate(before.data));
   if(new TextEncoder().encode(payload).length>850000)throw Error('La copia sigue superando la capacidad de la nube después de comprimirla. Exporta tus datos; siguen guardados localmente.');
   const result=await db.runTransaction(async tx=>{
    const snapshot=await tx.get(ref),remote=snapshot.exists?snapshot.data():null;
    if(remote?.commitId===before.commitId)return {revision:remote.revision};
    if((remote?.revision||0)!==before.revision)return {conflict:remote||{revision:0,payload:JSON.stringify(CAStore.empty()),commitId:null}};
    const revision=before.revision+1;
    tx.set(ref,{schemaVersion:2,revision,payload,commitId:before.commitId,updatedAt:firebase.firestore.FieldValue.serverTimestamp()});
    return {revision};
   });
   if(CAStore.uid!==uid)return;
   if(result.conflict){showConflict(result.conflict);return}
   const current=CAStore.envelope;
   CAStore.persist({...current,revision:result.revision,dirty:current.commitId!==before.commitId});
  }else{
   const snapshot=await ref.get({source:'server'});
   if(CAStore.uid!==uid)return;
   if(snapshot.exists){
    const remote=snapshot.data();
    if(CAStore.envelope.dirty){if(remote.revision!==before.revision)showConflict(remote);return}
    const parsed=CAStore.validate(decodeCloud(remote.payload));
    if(remote.revision!==before.revision){
     if(globalThis.CAFormState?.hasDraft?.()||document.querySelector('dialog[open]')?.open){deferDraftSync();return}
     CAStore.persist({data:parsed,revision:remote.revision,dirty:false,commitId:remote.commitId});refreshAccountData();
    }
   }else if(before.revision!==0)throw Error('La copia de la nube ya no existe. Exporta tu copia local antes de continuar.');
  }
  completed=true;lastRead=Date.now();cloudStatus(CAStore.envelope.dirty?'Cambios nuevos pendientes':'Sincronizado · '+new Date().toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}));
 }catch(e){cloudStatus(friendlyError(e))}finally{
  busy=false;$('signOut').disabled=false;
  if(completed&&CAStore.envelope.dirty&&!conflict)timer=setTimeout(()=>syncCloud(),3000);
 }
}
function importGuest(){
 if(!cloudUser||busy||conflict)return;
 if(!confirm('¿Copiar los datos del modo local a esta cuenta? Sustituirá sus datos actuales; se guardará una copia de recuperación.'))return;
 try{const guest=CAStore.read(null);CAStore.backup(data,'antes_importar');data=guest.data;save();refreshAccountData()}catch(e){cloudStatus(friendlyError(e))}
}
async function exportRecovery(){
 const prefix='mcp_v2_backup_'+(CAStore.uid||'guest')+'_',copies={};
 for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k.startsWith(prefix))copies[k]=JSON.parse(localStorage.getItem(k))}
 await downloadFileCompat(new Blob([JSON.stringify(copies,null,2)],{type:'application/json'}),'Mis_Cuentas_PRO_recuperacion.json');
}
async function initCloud(){
 try{
  firebase.initializeApp(firebaseConfig);auth=firebase.auth();db=firebase.firestore();
  await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
  auth.onAuthStateChanged(user=>{
   clearTimeout(timer);cloudUser=user;conflict=null;lastRead=0;
   const nextUid=user?.uid||null;
   if(CAStore.uid!==nextUid||!CAStore.envelope){
    $('conflictPanel').hidden=true;$('dlg').close();for(const dialog of document.querySelectorAll?.('dialog[open]')||[])dialog.close();
    try{CAStore.open(nextUid);refreshAccountData()}catch(e){cloudStatus('No se pudo abrir la copia local: '+e.message);document.querySelector('.app').inert=true;return}
   }
   $('accountName').textContent=user?user.email:'Modo local';
   $('authForm').hidden=!!user;$('signedIn').hidden=!user;
   authReady=true;cloudStatus(user?'Copia local de tu cuenta preparada':'Sin cuenta · tus datos permanecen en este dispositivo');
   if(user)syncCloud(true);
  });
 }catch(e){cloudStatus(friendlyError(e))}
}
window.addEventListener('online',()=>syncCloud(true));
window.addEventListener('offline',()=>cloudStatus('Sin conexión · copia local disponible'));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncCloud()});
document.addEventListener('close',event=>{if(event.target.tagName==='DIALOG'&&cloudUser){if(CAStore.envelope.dirty)scheduleSync();else syncCloud()}},true);
initCloud();
