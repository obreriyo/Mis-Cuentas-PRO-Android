(async function(){
 // The native upgrade first visits the EXACT v1 file URL to copy its localStorage.
 // Do not run the application until MainActivity has moved to the HTTPS origin.
 if(location.protocol==='file:'){document.body.innerHTML='<p>Preparando tu copia local…</p>';return}
 function load(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;document.body.appendChild(s)})}
 async function start(){
  try{
   if(localStorage.getItem('mcp_pin_hash'))document.getElementById('lockScreen').style.display='flex';
   await load('app.js');await load('cloud.js');
   if(localStorage.getItem('mcp_pin_hash'))document.getElementById('lockScreen').style.display='flex';
   updateFabForPage();
   if('serviceWorker' in navigator&&!window.AndroidPrint)navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }catch(e){document.getElementById('syncStatus').textContent='No se pudo abrir la copia local. Conserva los datos del navegador y exporta una copia antes de restablecer la app.';console.error(e)}
 }
 if(navigator.locks){
  navigator.locks.request('mcp-single-editor',{ifAvailable:true},async lock=>{
   if(!lock){document.body.innerHTML='<main style="font:18px system-ui;padding:40px"><h1>Mis Cuentas PRO ya está abierta</h1><p>Utiliza la otra pestaña para evitar cambios simultáneos. Ciérrala y recarga esta página para continuar aquí.</p><button onclick="location.reload()">Volver a intentar</button></main>';return}
   await start();await new Promise(()=>{});
  });
 }else{
  document.body.innerHTML='<main style="font:18px system-ui;padding:40px"><h1>Actualiza tu navegador</h1><p>Para proteger los datos frente a pestañas simultáneas, usa una versión reciente de Chrome, Edge, Firefox, Safari o Android System WebView.</p></main>';
 }
})();
