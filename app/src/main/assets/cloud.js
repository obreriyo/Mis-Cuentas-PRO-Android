'use strict';
const firebaseConfig={apiKey:'AIzaSyDgPzSN0OKw84QF_nubKfkrmfAr4MYyb7o',authDomain:'mis-cuentas-pro-b565d.firebaseapp.com',projectId:'mis-cuentas-pro-b565d',storageBucket:'mis-cuentas-pro-b565d.firebasestorage.app',messagingSenderId:'1056054862154',appId:'1:1056054862154:web:b8ea9e7db485ad101ee1b3'};
const $=id=>document.getElementById(id);
let auth,db,cloudUser=null,busy=false,timer,lastRead=0,conflict=null,authReady=false;
function cloudStatus(text){$('syncStatus').textContent=text}
function refreshAccountData(){
 data=MCPStore.validate(MCPStore.envelope.data);
 owner.value=data.settings.owner;irpf.value=data.settings.irpf;
 for(const id of ['monthList','monthlyReport','gestoria'])$(id).innerHTML='';
 $('pdfActions').style.display='none';$('pdfPreviewOverlay')?.remove();
 render();
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
   if(MCPStore.envelope.dirty&&!confirm('Hay cambios pendientes. Quedarán guardados en este dispositivo para esta cuenta. ¿Cerrar sesión?'))return;
   await auth.signOut();return;
  }
  const email=$('authEmail').value.trim(),password=$('authPassword').value;
  if(!email||!password)throw Error('Introduce correo y contraseña.');
  $('authControls').disabled=true;
  if(action==='register')await auth.createUserWithEmailAndPassword(email,password);
  else await auth.signInWithEmailAndPassword(email,password);
  $('authPassword').value='';
 }catch(e){$('authMessage').textContent=friendlyError(e)}finally{$('authControls').disabled=false}
}
function showConflict(remote){
 conflict=remote;$('conflictPanel').hidden=false;
 cloudStatus('Conflicto: móvil y PC tienen cambios. Elige qué copia conservar.');
}
async function resolveConflict(keepLocal){
 if(!conflict||busy)return;
 if(!confirm(keepLocal?'¿Sustituir la copia de la nube por esta copia local? Se guardará una copia de recuperación de la nube en este dispositivo.':'¿Usar la copia de la nube? Se guardará una copia de recuperación de tus cambios locales en este dispositivo.'))return;
 try{
  const remote=conflict;
  MCPStore.backup(keepLocal?MCPStore.validate(JSON.parse(remote.payload)):data,keepLocal?'nube':'local');
  MCPStore.persist({...MCPStore.envelope,revision:remote.revision,...(!keepLocal?{data:MCPStore.validate(JSON.parse(remote.payload)),dirty:false,commitId:remote.commitId}:{dirty:true,commitId:crypto.randomUUID()})});
  conflict=null;$('conflictPanel').hidden=true;refreshAccountData();await syncCloud(true);
 }catch(e){cloudStatus(friendlyError(e))}
}
async function syncCloud(force=false){
 if(!cloudUser||busy||!authReady||conflict)return;
 if(!navigator.onLine){cloudStatus('Sin conexión · copia local disponible');return}
 if($('dlg').open){cloudStatus('Sincronización pendiente hasta cerrar el movimiento');return}
 if(!force&&!MCPStore.envelope.dirty&&Date.now()-lastRead<60000)return;
 busy=true;$('signOut').disabled=true;let completed=false;
 const uid=cloudUser.uid,ref=db.doc('users/'+uid+'/state/main');
 const before=structuredClone(MCPStore.envelope);
 try{
  cloudStatus('Sincronizando…');
  if(before.dirty){
   const payload=JSON.stringify(MCPStore.validate(before.data));
   if(new TextEncoder().encode(payload).length>850000)throw Error('La copia supera el límite de sincronización (850 KB). Exporta tus datos. Siguen guardados localmente.');
   const result=await db.runTransaction(async tx=>{
    const snapshot=await tx.get(ref),remote=snapshot.exists?snapshot.data():null;
    if(remote?.commitId===before.commitId)return {revision:remote.revision};
    if((remote?.revision||0)!==before.revision)return {conflict:remote||{revision:0,payload:JSON.stringify(MCPStore.empty()),commitId:null}};
    const revision=before.revision+1;
    tx.set(ref,{schemaVersion:2,revision,payload,commitId:before.commitId,updatedAt:firebase.firestore.FieldValue.serverTimestamp()});
    return {revision};
   });
   if(MCPStore.uid!==uid)return;
   if(result.conflict){showConflict(result.conflict);return}
   const current=MCPStore.envelope;
   MCPStore.persist({...current,revision:result.revision,dirty:current.commitId!==before.commitId});
  }else{
   const snapshot=await ref.get({source:'server'});
   if(MCPStore.uid!==uid)return;
   if(snapshot.exists){
    const remote=snapshot.data();
    if(MCPStore.envelope.dirty){if(remote.revision!==before.revision)showConflict(remote);return}
    const parsed=MCPStore.validate(JSON.parse(remote.payload));
    if(remote.revision!==before.revision){
     MCPStore.persist({data:parsed,revision:remote.revision,dirty:false,commitId:remote.commitId});refreshAccountData();
    }
   }else if(before.revision!==0)throw Error('La copia de la nube ya no existe. Exporta tu copia local antes de continuar.');
  }
  completed=true;lastRead=Date.now();cloudStatus(MCPStore.envelope.dirty?'Cambios nuevos pendientes':'Sincronizado · '+new Date().toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}));
 }catch(e){cloudStatus(friendlyError(e))}finally{
  busy=false;$('signOut').disabled=false;
  if(completed&&MCPStore.envelope.dirty&&!conflict)timer=setTimeout(()=>syncCloud(),3000);
 }
}
function importGuest(){
 if(!cloudUser||busy||conflict)return;
 if(!confirm('¿Copiar los datos del modo local a esta cuenta? Sustituirá sus datos actuales; se guardará una copia de recuperación.'))return;
 try{const guest=MCPStore.read(null);MCPStore.backup(data,'antes_importar');data=guest.data;save();refreshAccountData()}catch(e){cloudStatus(friendlyError(e))}
}
async function exportRecovery(){
 const prefix='mcp_v2_backup_'+(MCPStore.uid||'guest')+'_',copies={};
 for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k.startsWith(prefix))copies[k]=JSON.parse(localStorage.getItem(k))}
 await downloadFileCompat(new Blob([JSON.stringify(copies,null,2)],{type:'application/json'}),'Mis_Cuentas_recuperacion.json');
}
async function initCloud(){
 try{
  firebase.initializeApp(firebaseConfig);auth=firebase.auth();db=firebase.firestore();
  await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
  auth.onAuthStateChanged(user=>{
   clearTimeout(timer);cloudUser=user;conflict=null;lastRead=0;
   $('conflictPanel').hidden=true;$('dlg').close();
   try{MCPStore.open(user?.uid||null);refreshAccountData()}catch(e){cloudStatus('No se pudo abrir la copia local: '+e.message);document.querySelector('.app').inert=true;return}
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
$('dlg').addEventListener('close',()=>{if(MCPStore.envelope.dirty)scheduleSync()});
initCloud();
