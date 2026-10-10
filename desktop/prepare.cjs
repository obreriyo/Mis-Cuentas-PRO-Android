const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const src=path.join(__dirname,'../app/src/main/assets'),dest=path.join(__dirname,'assets');
fs.rmSync(dest,{recursive:true,force:true});fs.cpSync(src,dest,{recursive:true});
const index=path.join(dest,'index.html');let html=fs.readFileSync(index,'utf8');if(!html.includes('<head>'))throw Error('No se encuentra la cabecera');html=html.replace('<head>','<head>\n<script src="desktop-adapter.js"></script>');fs.writeFileSync(index,html);
fs.copyFileSync(path.join(__dirname,'adapter.js'),path.join(dest,'desktop-adapter.js'));
const backup=path.join(dest,'backups.js');if(fs.existsSync(backup))fs.writeFileSync(backup,fs.readFileSync(backup,'utf8').replaceAll('confirma en Android','confirma en Windows'));
fs.writeFileSync(path.join(dest,'source-manifest.json'),JSON.stringify(Object.fromEntries(fs.readdirSync(src).filter(n=>fs.statSync(path.join(src,n)).isFile()).map(n=>[n,crypto.createHash('sha256').update(fs.readFileSync(path.join(src,n))).digest('hex')])),null,2));
console.log('Interfaz y contabilidad preparadas desde los archivos actuales de Android.');
