(function(root){
 'use strict';
 const labels={cash:'Efectivo',card:'Tarjeta',transfer:'Transferencia',unspecified:'Sin especificar'};
 function method(m){return Object.hasOwn(labels,m.paymentMethod)?m.paymentMethod:'unspecified'}
 function split(movements){
  const result={cash:0,card:0,transfer:0,unspecified:0,total:0,unspecifiedCount:0};
  for(const m of movements){if(m.type!=='Ingreso')continue;const kind=method(m),amount=Number(m.total)||0;result[kind]+=amount;result.total+=amount;if(kind==='unspecified')result.unspecifiedCount++}
  return result;
 }
 function cashYear(movements,deposits,year){
  let cash=0,unknown=0,unknownCount=0,bank=0;const months=[];
  for(let month=1;month<=12;month++){
   const inMonth=x=>Number(x.date.slice(0,4))===year&&Number(x.date.slice(5,7))===month;
   const income=split(movements.filter(inMonth));
   const deposit=deposits.filter(inMonth).reduce((s,x)=>s+(Number(x.amount)||0),0);
   cash+=income.cash-deposit;unknown+=income.unspecified;unknownCount+=income.unspecifiedCount;
   bank+=deposit+income.card+income.transfer;
   months.push({month,...income,deposit,cash,unknown,unknownCount,provisionalCash:cash+unknown,bankEntries:bank});
  }
  return months;
 }
 root.CAPayments={labels,method,split,cashYear};
})(globalThis);
