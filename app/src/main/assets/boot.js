(async function(){
 if(location.protocol==='file:'){document.body.innerHTML='<p>Preparando tu copia local…</p>';return}
 function load(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;document.body.appendChild(s)})}
 async function start(){
  try{
   if(localStorage.getItem('mcp_pin_hash'))document.getElementById('lockScreen').style.display='flex';
   await load('app.js');await load('cloud.js');
   if(localStorage.getItem('mcp_pin_hash'))document.getElementById('lockScreen').style.display='flex';
   updateFabForPage();
   if('serviceWorker' in navigator&&!window.AndroidPrint)navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }catch(e){
   const s=document.getElementById('syncStatus');
   if(s)s.textContent='No se pudo abrir la copia local. Conserva los datos y exporta una copia antes de restablecer la app.';
   console.error(e)
  }
 }

 // En la app Android no necesitamos el bloqueo de pestañas del navegador.
 if(window.AndroidPrint){await start();return}

 if(navigator.locks){
  navigator.locks.request('mcp-single-editor',{ifAvailable:true},async lock=>{
   if(!lock){
    document.body.innerHTML='<main style="font:18px system-ui;padding:40px"><h1>Mis Cuentas PRO ya está abierta</h1><p>Utiliza la otra pestaña para evitar cambios simultáneos. Ciérrala y recarga esta página para continuar aquí.</p><button onclick="location.reload()">Volver a intentar</button></main>';
    return
   }
   await start();
   await new Promise(()=>{});
  });
 }else{
  await start();
 }
})();
