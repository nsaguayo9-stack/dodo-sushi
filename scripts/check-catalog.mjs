import fs from 'node:fs';import vm from 'node:vm';
const script=fs.readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const csv=fs.readFileSync(new URL('../public/catalogo-respaldo.csv',import.meta.url),'utf8');
const prefix=script.slice(0,script.indexOf("$('#year')"));
const context=vm.createContext({Intl,Set,Number,String,JSON,Array,localStorage:{getItem:()=>null},document:{querySelector:()=>({})}});
vm.runInContext(prefix+`\n globalThis.result={count:makeProducts(${JSON.stringify(csv)}).length,first:makeProducts(${JSON.stringify(csv)})[0].price,tables:makeProducts(${JSON.stringify(csv)}).filter(p=>p.category==='Tablas a elección').length,toppings:makeProducts(${JSON.stringify(csv)}).filter(p=>p.category==='Coberturas para tablas').length,unavailable:available({stock:'no'})};`,context);
const r=context.result;console.log(r);
if(r.count!==65||r.first!==10000||r.tables!==5||r.toppings!==13||r.unavailable!==false)process.exit(1);
