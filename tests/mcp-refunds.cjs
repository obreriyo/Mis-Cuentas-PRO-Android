const assert=require('node:assert/strict'),h=require('./helpers/app-dom.cjs')(),{run,w}=h;
for(let i=0;i<300;i++){
 const acc=(i%3===0?-1:1)*(i*17%2000)/100;
 run(`data=CAStore.empty();var t=CATPV.ensure(data);t.products.push({id:'p',name:'Producto',price:333,vat:21,kind:'product',category:'',tracked:true,stock:6,archived:false},{id:'q',name:'Otro',price:501,vat:10,kind:'product',category:'',tracked:true,stock:2,archived:false});var s=CATPV.sell(data,{cart:[{productId:'p',qty:3},{productId:'q',qty:1}],date:'2026-01-09',method:'cash',discountBps:1250});data.movements.find(m=>m.vat===21).accounting=${acc};data.movements.find(m=>m.vat===10).accounting=2.51;save();CATPV.returnItems(data,s.id,[{index:0,qty:1,restock:true}],'2026-01-09','cash');save()`);
 const original=run('data.movements.find(m=>!m.tpvRefund&&m.vat===21)'),refund=run('data.movements.find(m=>m.tpvRefund)');
 assert.equal(Math.round(refund.accounting*100),(-Math.round(Math.abs(Math.round(acc*100))*Math.round(-refund.total*100)/Math.round(original.total*100))*(acc<0?-1:1))||0);
 w.prompt=()=>String(acc+1);run('editAccounting(data.movements.find(m=>!m.tpvRefund&&m.vat===21).id)');
 run(`CATPV.returnItems(data,s.id,[{index:0,qty:1,restock:false},{index:1,qty:1,restock:true}],'2026-01-10','card');save();CATPV.returnItems(data,s.id,[{index:0,qty:1,restock:true}],'2026-01-11','transfer');save()`);
 assert.equal(run('data.movements.reduce((n,m)=>n+Math.round((m.accounting??m.total)*100),0)'),0);
 assert.equal(run('data.movements.reduce((n,m)=>n+Math.round(m.total*100),0)'),0);
 assert.equal(run('data.tpv.products[0].stock'),5);assert.equal(run('data.tpv.products[1].stock'),2);
 assert.equal(run('CAStore.validate(data).tpv.sales[0].status'),'refunded');
}
w.close();console.log('OK 300 devoluciones: contable modificado, parciales y completas, IVA mixto, descuento, céntimos, importes negativos/cero, cambios posteriores, stock dañado y cobros reales');
