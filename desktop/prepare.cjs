'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const src=path.join(__dirname,'../app/src/main/assets'),dest=path.join(__dirname,'assets');
fs.rmSync(dest,{recursive:true,force:true});fs.cpSync(src,dest,{recursive:true});
fs.copyFileSync(path.join(__dirname,'adapter.js'),path.join(dest,'desktop-adapter.js'));
const backup=path.join(dest,'backups.js');if(fs.existsSync(backup))fs.writeFileSync(backup,fs.readFileSync(backup,'utf8').replaceAll('confirma en Android','confirma en Windows'));
const index=path.join(dest,'index.html');let html=fs.readFileSync(index,'utf8');if(!html.includes('<head>'))throw Error('No se encuentra la cabecera');html=html.replace('<head>','<head>\n<script src="desktop-adapter.js"></script>');
let count=0;
html=html.replace(/<script\b([^>]*)\bsrc="([^"]+)"([^>]*)>\s*<\/script>/gi,(_tag,before,name,after)=>{
 if(/\b(async|defer|type)\s*=/.test(before+after))throw Error('Revisar tipo u orden del script '+name);
 const file=path.resolve(dest,name),rel=path.relative(dest,file);
 if(rel.startsWith('..')||path.isAbsolute(rel)||!name.endsWith('.js'))throw Error('Script no permitido '+name);
 const content=fs.readFileSync(file,'utf8').replace(/<\/script/gi,'<\\/script');count++;
 return '<script data-desktop-script="'+name+'">\n'+content+'\n//# sourceURL=https://appassets.androidplatform.net/assets/'+name+'\n</script>';
});
if(count<10||/<script\b[^>]*\bsrc=/i.test(html))throw Error('La interfaz contiene scripts sin integrar');
fs.writeFileSync(index,html);
fs.writeFileSync(path.join(dest,'source-manifest.json'),JSON.stringify(Object.fromEntries(fs.readdirSync(src).filter(n=>fs.statSync(path.join(src,n)).isFile()).map(n=>[n,crypto.createHash('sha256').update(fs.readFileSync(path.join(src,n))).digest('hex')])),null,2));
console.log('Interfaz Windows preparada con '+count+' scripts integrados en su orden original.');
