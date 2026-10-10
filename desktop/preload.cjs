const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('DesktopBridge',{saveFile:(data,name)=>ipcRenderer.invoke('mcp:save',data,name),print:()=>ipcRenderer.invoke('mcp:print'),whatsapp:(phone,message)=>ipcRenderer.invoke('mcp:whatsapp',phone,message)});
