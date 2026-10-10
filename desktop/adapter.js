(()=>{'use strict';
window.AndroidFiles={saveFile(data,name){window.DesktopBridge.saveFile(data,name).then(r=>window.CABackups?.nativeSaved?.(r.saved,name)).catch(e=>{window.CABackups?.nativeSaved?.(false,name);alert('No se pudo guardar el archivo: '+e.message)})}};
window.AndroidPrint={printPage(){window.DesktopBridge.print().catch(e=>alert('No se pudo imprimir: '+e.message))}};
window.AndroidContacts={openWhatsApp(phone,message){window.DesktopBridge.whatsapp(String(phone),message).catch(e=>alert('No se pudo abrir WhatsApp: '+e.message))}};
})();
