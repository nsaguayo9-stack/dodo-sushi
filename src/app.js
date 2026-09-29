const CSV_URL='https://docs.google.com/spreadsheets/d/e/2PACX-1vTOPkgnps8XlQSU2oPoQINxLwM_AQ6y4b886CqwKjkiiCMuQ9JZsHRBsQHipJKuRg/pub?gid=821149956&single=true&output=csv';
const WHATSAPP='56973283730';
const FILLINGS=['Pollo','Carne','Camarón','Palmito','Kanikama','Vegetariano'];
const HIDDEN_CATEGORIES=new Set(['Coberturas para tablas']);
const HIDDEN_NAMES=new Set(['Tempurizar gyozas']);
const $=(selector)=>document.querySelector(selector);
const format=(value)=>new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(value);
const clean=(value)=>String(value??'').trim();
const esc=(value)=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const normalize=(value)=>clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
let products=[],category='Todos',query='',cart=readCart(),selected=null,lastFocus=null;

function parseCSV(input){
  const rows=[];let row=[],cell='',quoted=false;
  for(let i=0;i<input.length;i++){
    const char=input[i];
    if(char==='"'){
      if(quoted&&input[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;
    }else if(char===','&&!quoted){row.push(cell);cell='';}
    else if((char==='\n'||char==='\r')&&!quoted){if(char==='\r'&&input[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x!==''))rows.push(row);row=[];cell='';}
    else cell+=char;
  }
  row.push(cell);if(row.some(x=>x!==''))rows.push(row);
  return rows;
}
function makeProducts(csv){
  const [header,...rows]=parseCSV(csv.replace(/^\uFEFF/,''));
  if(!header)throw Error('CSV vacío');
  const keys=header.map(normalize);
  for(const name of ['categoria','nombre','precio','stock','foto'])if(!keys.includes(name))throw Error(`Falta columna ${name}`);
  const val=(row,key)=>clean(row[keys.indexOf(key)]);
  return rows.map((row)=>({
    category:val(row,'categoria'),name:val(row,'nombre'),description:val(row,'descripcion'),options:val(row,'opciones/tamanos'),
    price:Number(val(row,'precio').replace(/[^0-9]/g,'')),stock:val(row,'stock'),photo:val(row,'foto'),notes:val(row,'observaciones')
  })).filter(p=>p.category&&p.name&&Number.isFinite(p.price));
}
function keyOf(p){return `${p.category}|${p.name}`;}
function available(p){return ['si','sí','yes','true','1','disponible'].includes(normalize(p.stock));}
function readCart(){try{const c=JSON.parse(localStorage.getItem('dodo-cart-v1')||'[]');return Array.isArray(c)?c:[];}catch{return [];}}
function saveCart(){localStorage.setItem('dodo-cart-v1',JSON.stringify(cart));renderCart();}
async function loadCatalog(){
  try{
    const response=await fetch(`${CSV_URL}&t=${Date.now()}`,{cache:'no-store'});
    if(!response.ok)throw Error(`HTTP ${response.status}`);
    const data=makeProducts(await response.text());if(data.length<40)throw Error('Catálogo incompleto');
    products=data;$('#menu-status').textContent=`${visibleProducts().length} productos y opciones disponibles en la carta.`;
  }catch(error){
    try{const backup=await fetch('/catalogo-respaldo.csv');products=makeProducts(await backup.text());$('#menu-status').textContent='Mostrando una copia de la carta. Los cambios recientes podrían tardar en aparecer; prueba recargar.';}
    catch{$('#menu-status').textContent='No pudimos cargar la carta. Intenta recargar la página.';}
  }
  renderCategories();renderProducts();renderCart();
}
function visibleProducts(){return products.filter(p=>!HIDDEN_CATEGORIES.has(p.category)&&!HIDDEN_NAMES.has(p.name));}
function renderCategories(){
  const categories=['Todos',...new Set(visibleProducts().map(p=>p.category))];
  if(!categories.includes(category))category='Todos';
  $('#categories').innerHTML=categories.map(c=>`<button type="button" class="category-button ${c===category?'active':''}" data-category="${esc(c)}" aria-pressed="${c===category}">${esc(c)}</button>`).join('');
}
function renderProducts(){
  const list=visibleProducts().filter(p=>(category==='Todos'||p.category===category)&&normalize([p.name,p.description,p.category].join(' ')).includes(normalize(query)));
  $('#products').innerHTML=list.length?list.map(p=>{
    const index=products.indexOf(p);const unavailable=!available(p);
    return `<article class="product-card" data-product="${index}">
      ${p.photo?`<img class="product-photo" src="${esc(p.photo)}" alt="${esc(p.name)}" loading="lazy" referrerpolicy="no-referrer">`:''}
      <div class="product-body"><span class="product-category">${esc(p.category)}</span><h3>${esc(p.name)}</h3><p>${esc(p.description)}</p>
      ${p.options?`<span class="product-options">Opciones: ${esc(p.options)}</span>`:''}
      <div class="product-bottom"><span class="price">${format(p.price)}</span>${unavailable?'<span class="soldout">Agotado</span>':`<button type="button" class="add-button" data-add="${index}">Agregar +</button>`}</div></div></article>`;
  }).join(''):'<div class="empty-results">No encontramos productos con esa búsqueda.</div>';
  document.querySelectorAll('.product-photo').forEach(img=>img.addEventListener('error',()=>img.remove()));
}
function modalOpen(p){
  selected=p;lastFocus=document.activeElement;
  const table=p.category==='Tablas a elección';
  const gyoza=p.category==='Gyozas';
  const choices=p.options.split('/').map(clean).filter(Boolean);
  const topping=products.filter(item=>item.category==='Coberturas para tablas').map(item=>({name:item.name.replace(/^Cobertura /,''),price:item.price}));
  const number=table?Math.max(1,Math.min(5,Math.round(p.price?Number(p.name.match(/\d+/)?.[0]||1):1))):0;
  let content=`<h2 id="option-title">${esc(p.name)}</h2><p>${esc(p.description)}</p>`;
  if(table){
    content+='<p>Elige un relleno y una cobertura para cada roll. Cada cobertura se cobra por roll.</p>';
    for(let i=0;i<number;i++)content+=`<div class="roll-fields"><h3>Roll ${i+1}</h3><label class="field">Relleno<select class="roll-filling">${FILLINGS.map(f=>`<option>${esc(f)}</option>`).join('')}</select></label><label class="field">Cobertura<select class="roll-topping">${topping.map(t=>`<option value="${t.price}">${esc(t.name)} · ${t.price?format(t.price):'gratis'}</option>`).join('')}</select></label></div>`;
  }else if(choices.length){content+=`<label class="field">Elige una opción<select id="item-choice">${choices.map(c=>`<option>${esc(c)}</option>`).join('')}</select></label>`;}
  if(gyoza){const extra=products.find(item=>item.name==='Tempurizar gyozas');content+=`<label class="field check"><span><input type="checkbox" id="tempura"> Tempurizar gyozas (+${format(extra?.price||2000)})</span></label>`;}
  if(p.name==='Salmón Roll')content+='<label class="field">Cobertura deseada<textarea id="item-note" placeholder="Indica la cobertura que prefieres; se confirmará por WhatsApp"></textarea></label>';
  if(p.name==='Hand roll')content+='<label class="field">Indicaciones adicionales<textarea id="item-note" placeholder="Opcional"></textarea></label>';
  content+=`<div class="modal-summary"><span>Total por unidad</span><strong id="modal-price">${format(p.price)}</strong></div><button type="button" class="button primary full" id="confirm-add">Agregar al pedido <span aria-hidden="true">↗</span></button>`;
  $('#option-content').innerHTML=content;
  $('#option-modal').hidden=false;$('#overlay').hidden=false;document.body.classList.add('locked');
  $('#option-modal').querySelectorAll('select,input').forEach(el=>el.addEventListener('change',updateModalPrice));
  $('#confirm-add').addEventListener('click',()=>{
    const meta=[];let extra=0;
    if(table){const f=[...document.querySelectorAll('.roll-filling')],t=[...document.querySelectorAll('.roll-topping')];f.forEach((select,i)=>{meta.push(`Roll ${i+1}: ${select.value} / ${t[i].selectedOptions[0].textContent.split(' · ')[0]}`);extra+=Number(t[i].value)||0;});}
    else if($('#item-choice'))meta.push($('#item-choice').value);
    if(gyoza&&$('#tempura')?.checked){meta.push('Tempurizadas');extra+=products.find(x=>x.name==='Tempurizar gyozas')?.price||2000;}
    if($('#item-note')?.value.trim())meta.push($('#item-note').value.trim().slice(0,180));
    addToCart(p,meta.join('; '),extra);closePanels();
  });
  ($('#option-modal').querySelector('select')||$('#confirm-add')).focus();
}
function updateModalPrice(){if(!selected)return;let extra=0;document.querySelectorAll('.roll-topping').forEach(el=>extra+=Number(el.value)||0);if($('#tempura')?.checked)extra+=products.find(x=>x.name==='Tempurizar gyozas')?.price||2000;$('#modal-price').textContent=format(selected.price+extra);}
function addToCart(p,details='',extra=0){
  const base=keyOf(p),id=JSON.stringify([base,details]);const existing=cart.find(item=>item.id===id);
  if(existing)existing.quantity++;else cart.push({id,base,name:p.name,details,extra,quantity:1,price:p.price});
  saveCart();openDrawer();
}
function currentPrice(item){const p=products.find(x=>keyOf(x)===item.base);return (p?.price??item.price)+item.extra;}
function validItems(){return cart.filter(item=>{const p=products.find(x=>keyOf(x)===item.base);return p&&available(p);});}
function renderCart(){
  const count=cart.reduce((total,item)=>total+item.quantity,0),total=cart.reduce((sum,item)=>sum+currentPrice(item)*item.quantity,0);
  $('#cart-count').textContent=count;$('#cart-total').textContent=format(total);$('#mobile-cart-total').textContent=format(total);
  $('#mobile-cart').hidden=count===0;$('#checkout').disabled=!validItems().length;
  $('#cart-items').innerHTML=cart.length?cart.map((item,i)=>{
    const live=products.find(p=>keyOf(p)===item.base),unavailable=!live||!available(live);
    return `<div class="cart-row"><div><h3>${esc(item.name)}</h3>${item.details?`<p>${esc(item.details)}</p>`:''}${unavailable?'<p class="soldout">Agotado: quítalo antes de enviar</p>':''}<div class="qty"><button data-qty="${i}" data-delta="-1" aria-label="Restar ${esc(item.name)}">−</button><span>${item.quantity}</span><button data-qty="${i}" data-delta="1" aria-label="Sumar ${esc(item.name)}">+</button></div></div><div><strong>${format(currentPrice(item)*item.quantity)}</strong><br><button class="remove" data-remove="${i}">Eliminar</button></div></div>`;
  }).join(''):'<p class="cart-empty">Tu carrito está esperando algo rico. Explora la carta y agrega tus favoritos.</p>';
}
function openDrawer(){lastFocus=document.activeElement;$('#drawer').hidden=false;$('#option-modal').hidden=true;$('#overlay').hidden=false;document.body.classList.add('locked');$('#drawer [data-close]').focus();}
function closePanels(){$('#drawer').hidden=true;$('#option-modal').hidden=true;$('#overlay').hidden=true;document.body.classList.remove('locked');lastFocus?.focus?.();}
function checkout(){
  if(cart.some(item=>!validItems().includes(item))){alert('Hay productos agotados en el carrito. Quítalos antes de enviar el pedido.');return;}
  if(!cart.length)return;
  const lines=['Hola Dodo Sushi, quisiera hacer este pedido:',...cart.map(item=>`• ${item.quantity} × ${item.name}${item.details?` (${item.details})`:''} — ${format(currentPrice(item)*item.quantity)}`),'',`Total productos: ${format(cart.reduce((sum,item)=>sum+currentPrice(item)*item.quantity,0))}`,'Por favor, confirmen disponibilidad y costo de despacho/retiro.'];
  window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(lines.join('\n'))}`,'_blank','noopener,noreferrer');
}
$('#year').textContent=new Date().getFullYear();
$('#categories').addEventListener('click',event=>{const button=event.target.closest('[data-category]');if(!button)return;category=button.dataset.category;renderCategories();renderProducts();});
$('#search').addEventListener('input',event=>{query=event.target.value;renderProducts();});
$('#products').addEventListener('click',event=>{const button=event.target.closest('[data-add]');if(!button)return;const p=products[Number(button.dataset.add)];if(!p||!available(p))return;if(p.category==='Tablas a elección'||p.options||p.category==='Gyozas'||p.name==='Salmón Roll')modalOpen(p);else addToCart(p);});
$('#cart-items').addEventListener('click',event=>{const qty=event.target.closest('[data-qty]'),remove=event.target.closest('[data-remove]');if(qty){const i=Number(qty.dataset.qty);cart[i].quantity+=Number(qty.dataset.delta);if(cart[i].quantity<=0)cart.splice(i,1);saveCart();}else if(remove){cart.splice(Number(remove.dataset.remove),1);saveCart();}});
$('#cart-trigger').addEventListener('click',openDrawer);$('#mobile-cart').addEventListener('click',openDrawer);$('#checkout').addEventListener('click',checkout);
document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',closePanels));$('#overlay').addEventListener('click',closePanels);
document.addEventListener('keydown',event=>{if(event.key==='Escape')closePanels();});
loadCatalog();
