'use strict';
const path=require('node:path');
const ORIGIN='https://appassets.androidplatform.net';
function local(raw){try{const u=new URL(raw);return u.origin===ORIGIN&&u.pathname.startsWith('/assets/')}catch{return false}}
function asset(root,raw){if(!local(raw))throw Error('Origen no permitido');const p=decodeURIComponent(new URL(raw).pathname.slice(8));if(/[\\\0]/.test(p))throw Error('Ruta no permitida');const out=path.resolve(root,p),rel=path.relative(root,out);if(!rel||rel.startsWith('..')||path.isAbsolute(rel))throw Error('Ruta no permitida');return out}
function fileName(n){if(typeof n!=='string'||n.length>180||/[/\\\x00-\x1f<>:"|?*]/.test(n)||/^[.]|[. ]$/.test(n)||/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(n)||!/[.](json|pdf|xlsx|png|jpg|jpeg)$/i.test(n))throw Error('Nombre no permitido');return n}
function bytes(s){if(typeof s!=='string'||s.length>35000000||s.length%4||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(s))throw Error('Archivo no válido');const b=Buffer.from(s,'base64');if(!b.length||b.length>25*1024*1024)throw Error('Tamaño no permitido');return b}
function whatsapp(phone,msg){if(!/^\d{7,15}$/.test(String(phone))||typeof msg!=='string'||msg.length>4000)throw Error('Teléfono o mensaje no válido');const u=new URL('https://wa.me/'+phone);u.searchParams.set('text',msg);return u.href}
function external(raw){try{const u=new URL(raw);return u.protocol==='https:'&&!u.username&&!u.password&&(u.hostname==='wa.me'&&/^\/\d{7,15}$/.test(u.pathname)||u.hostname==='github.com'&&/^\/obreriyo\/Mis-Cuentas-PRO-Android(?:\/|$)/.test(u.pathname))}catch{return false}}
module.exports={ORIGIN,HOME:ORIGIN+'/assets/index.html',local,asset,fileName,bytes,whatsapp,external};
