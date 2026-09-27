const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
fs.cpSync(path.join(root,'app/src/main/assets'),path.join(root,'web'),{recursive:true});
console.log('Versión web actualizada desde los mismos archivos de Android.');
