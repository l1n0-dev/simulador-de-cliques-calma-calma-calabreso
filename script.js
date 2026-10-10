import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const MAX_CLICKS=1000000, SAVE_KEY="calmaCalmaCalabresoSave_v1";
const pets=[
{id:"calabresinha",name:"Calabresinha",emoji:"🌶️",mult:1.1,price:500},
{id:"pintinho",name:"Pintinho Picante",emoji:"🐥",mult:1.2,price:1000},
{id:"gato",name:"Gato Calabreso",emoji:"🐱",mult:1.3,price:2000},
{id:"cachorro",name:"Cachorro Churrasco",emoji:"🐶",mult:1.5,price:3500},
{id:"coelho",name:"Coelho Apimentado",emoji:"🐰",mult:1.7,price:5000},
{id:"dragao",name:"Dragão de Calabresa",emoji:"🐉",mult:2,price:10000},
{id:"porquinho",name:"Porquinho Dourado",emoji:"🐷",mult:2.5,price:20000},
{id:"fenix",name:"Fênix Calabresa",emoji:"🦅",mult:3,price:35000},
{id:"alien",name:"Alien Calabreso",emoji:"👽",mult:4,price:75000},
{id:"deus",name:"Deus Calabreso",emoji:"👑",mult:5,price:150000}
];
const eggs=[
{id:"apimentado",name:"Ovo Apimentado",emoji:"🥚",price:500,odds:[["calabresinha",50],["pintinho",30],["gato",15],["cachorro",5]]},
{id:"churrasqueiro",name:"Ovo Churrasqueiro",emoji:"🍳",price:5000,odds:[["gato",35],["cachorro",30],["coelho",20],["dragao",10],["porquinho",4],["fenix",1]]},
{id:"divino",name:"Ovo Divino",emoji:"✨",price:50000,odds:[["coelho",20],["dragao",30],["porquinho",25],["fenix",21],["alien",3],["deus",1]]}
];
const events=[
{id:"petEnergetico",name:"Pet Energizado",emoji:"⚡",chance:12,duration:60000,effect:2,desc:"Os bônus dos pets ficam dobrados!"},
{id:"chuvaCliques",name:"Chuva de Cliques",emoji:"🌧️",chance:8,duration:45000,effect:1.5,desc:"+50% cliques ganhos!"},
{id:"mutacao",name:"Mutação Calabresa",emoji:"🧬",chance:10,duration:30000,effect:3,desc:"Bônus dos pets triplicado!"},
{id:"petCansou",name:"Pet Cansou",emoji:"🥱",chance:5,duration:45000,effect:.5,desc:"Bônus dos pets pela metade."},
{id:"febre",name:"Pet Ficou com Febre",emoji:"🤒",chance:1,duration:30000,effect:0,desc:"Os bônus dos pets ficam neutralizados."}
];
const $=id=>document.getElementById(id), fmt=n=>Math.floor(n).toLocaleString("pt-BR"), multFmt=n=>"x"+n.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});
const fresh=()=>({clicks:0,rebirths:0,owned:{},equipped:[],totalClicks:0,lastEvent:null,eventUntil:0,updatedAt:Date.now()});
function load(){try{const s=JSON.parse(localStorage.getItem(SAVE_KEY)||"null");if(s&&typeof s==="object")return {...fresh(),...s,owned:s.owned||{},equipped:Array.isArray(s.equipped)?s.equipped:[]};}catch(e){}return fresh();}
let state=load(),currentUser=null,db=null,auth=null,cloudReady=false,toastTimer,saveTimer;
const pet=id=>pets.find(p=>p.id===id), eventNow=()=>state.lastEvent&&Date.now()<state.eventUntil?events.find(e=>e.id===state.lastEvent):null;
function toast(msg){$("toast").textContent=msg;$("toast").classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>$("toast").classList.remove("show"),2600);}
function save(){state.updatedAt=Date.now();localStorage.setItem(SAVE_KEY,JSON.stringify(state));$("save-status").textContent=currentUser?"Salvando na nuvem + local":"Salvo neste navegador";if(currentUser&&cloudReady){clearTimeout(saveTimer);saveTimer=setTimeout(async()=>{try{await setDoc(doc(db,"saves",currentUser.uid),{gameSave:state,updatedAt:Date.now()});$("save-status").textContent="Salvo na nuvem ✓";}catch(e){console.error(e);$("save-status").textContent="Nuvem falhou • salvo localmente";}},500);}}
function totalMult(){const ev=eventNow();let pm=state.equipped.reduce((v,id)=>{const p=pet(id);if(!p||!state.owned[id])return v;return v*(1+(p.mult-1)*(ev&&["petEnergetico","mutacao","petCansou","febre"].includes(ev.id)?ev.effect:1));},1);const rm=1+state.rebirths*.015,weather=ev?.id==="chuvaCliques"?1.5:1;return {total:pm*rm*weather,rebirth:rm};}
function renderEggs(){$("egg-list").innerHTML="";eggs.forEach(e=>{const odds=e.odds.map(([id,ch])=>`${pet(id).name} ${ch}%`).join(" • ");const el=document.createElement("div");el.className="egg-card";el.innerHTML=`<span class="egg-emoji">${e.emoji}</span><div class="egg-info"><strong>${e.name}</strong><small>Preço: ${fmt(e.price)} cliques</small><br><small>${odds}</small></div><button>Comprar</button>`;el.querySelector("button").onclick=()=>buyEgg(e.id);$("egg-list").appendChild(el);});}
function renderCatalog(){$("pet-catalog").innerHTML="";pets.forEach(p=>{const el=document.createElement("div");el.className="catalog-card";el.innerHTML=`<span class="emoji">${p.emoji}</span><div><strong>${p.name} • x${String(p.mult).replace(".",",")}</strong><small>Preço de referência: ${fmt(p.price)} cliques</small></div>`;$("pet-catalog").appendChild(el);});}
function renderInventory(){const root=$("pet-inventory");root.innerHTML="";const owned=pets.filter(p=>state.owned[p.id]>0),count=Object.values(state.owned).reduce((a,b)=>a+(Number(b)||0),0);$("pet-total").textContent=`${count} ${count===1?"pet":"pets"}`;if(!owned.length){root.innerHTML='<p class="muted">Você ainda não tem pets. Abra um ovo para começar!</p>';return;}owned.forEach(p=>{const on=state.equipped.includes(p.id),el=document.createElement("div");el.className="pet-card";el.innerHTML=`<span class="pet-emoji">${p.emoji}</span><div class="pet-info"><strong>${p.name} <span class="equipped-tag">${on?"EQUIPADO":""}</span></strong><small>x${String(p.mult).replace(".",",")} • Quantidade: ${state.owned[p.id]}</small></div><button class="${on?"unequip":"equip"}">${on?"Desequipar":"Equipar"}</button>`;el.querySelector("button").onclick=()=>toggleEquip(p.id);root.appendChild(el);});}
function render(){const m=totalMult();$("click-count").textContent=fmt(state.clicks);$("progress-fill").style.width=`${Math.min(100,state.clicks/MAX_CLICKS*100)}%`;$("progress-text").textContent=`${fmt(state.clicks)} / ${fmt(MAX_CLICKS)}`;$("total-multiplier").textContent=multFmt(m.total);$("rebirth-mult").textContent=multFmt(m.rebirth);$("rebirth-count").textContent=fmt(state.rebirths);$("equipped-count").textContent=`${state.equipped.length}/3`;$("click-power").textContent=`+${fmt(m.total)} por clique`;$("rebirth-button").disabled=state.clicks<MAX_CLICKS;$("rebirth-button").textContent=state.clicks>=MAX_CLICKS?"🔄 Renascimento disponível!":"🔄 Renascimento (1.000.000)";const ev=eventNow();$("event-banner").textContent=ev?`${ev.emoji} ${ev.name}: ${ev.desc} (${Math.max(1,Math.ceil((state.eventUntil-Date.now())/1000))}s)`:"Nenhum evento ativo";renderInventory();}
function buyEgg(id){const e=eggs.find(x=>x.id===id);if(state.clicks<e.price){toast(`Faltam ${fmt(e.price-state.clicks)} cliques para comprar esse ovo.`);return;}state.clicks-=e.price;let r=Math.random()*100,acc=0,got=e.odds[e.odds.length-1][0];for(const [id,ch] of e.odds){acc+=ch;if(r<acc){got=id;break;}}state.owned[got]=(state.owned[got]||0)+1;const p=pet(got);$("egg-result").textContent=`${p.emoji} Você tirou ${p.name} (x${String(p.mult).replace(".",",")})!`;toast(`Novo pet: ${p.name}!`);save();render();}
function toggleEquip(id){if(state.equipped.includes(id)){state.equipped=state.equipped.filter(x=>x!==id);toast("Pet desequipado.");}else if(state.equipped.length>=3){toast("Você só pode equipar 3 pets por vez.");return;}else{state.equipped.push(id);toast(`${pet(id).name} equipado!`);}save();render();}
function maybeEvent(){if(eventNow()||Math.random()>.035)return;const total=events.reduce((a,e)=>a+e.chance,0);let r=Math.random()*total;for(const e of events){r-=e.chance;if(r<=0){state.lastEvent=e.id;state.eventUntil=Date.now()+e.duration;toast(`${e.emoji} Evento: ${e.name}!`);break;}}}
$("click-button").onclick=()=>{if(state.clicks>=MAX_CLICKS){toast("Você chegou a 1.000.000! Faça o renascimento.");return;}const amount=Math.max(1,Math.floor(totalMult().total));state.clicks=Math.min(MAX_CLICKS,state.clicks+amount);state.totalClicks+=amount;maybeEvent();save();render();};
$("rebirth-button").onclick=()=>{if(state.clicks<MAX_CLICKS)return;state.rebirths++;state.clicks=0;toast(`Renascimento #${state.rebirths}! Bônus permanente aumentado.`);save();render();};
$("export-save").onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download="calabreso-backup.json";a.click();URL.revokeObjectURL(url);};
$("import-save").onclick=()=>$("import-file").click();
$("import-file").onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{const d=JSON.parse(await f.text());if(typeof d.clicks!=="number"||!d.owned||!Array.isArray(d.equipped))throw Error();state={...fresh(),...d};state.clicks=Math.max(0,Math.min(MAX_CLICKS,Number(state.clicks)||0));state.equipped=state.equipped.filter(id=>state.owned[id]>0&&pet(id)).slice(0,3);save();render();toast("Backup importado!");}catch(err){toast("Não consegui importar esse arquivo.");}e.target.value="";};
$("reset-save").onclick=()=>{if(!confirm("Tem certeza que quer apagar TODO o progresso salvo neste navegador?"))return;state=fresh();save();render();toast("Progresso local reiniciado.");};

const configured=firebaseConfig.apiKey&&!firebaseConfig.apiKey.startsWith("COLE_")&&firebaseConfig.projectId&&!firebaseConfig.projectId.startsWith("SEU-");
if(configured){try{const app=initializeApp(firebaseConfig);auth=getAuth(app);db=getFirestore(app);cloudReady=true;onAuthStateChanged(auth,async user=>{currentUser=user||null;$("google-login").classList.toggle("hidden",!!user);$("google-logout").classList.toggle("hidden",!user);if(!user){$("save-status").textContent="Salvo neste navegador";return;}try{$("save-status").textContent="Sincronizando...";const ref=doc(db,"saves",user.uid),snap=await getDoc(ref);if(snap.exists()&&snap.data().gameSave){const cloud=snap.data().gameSave;if((Number(cloud.updatedAt)||0)>(Number(state.updatedAt)||0)){state={...fresh(),...cloud};localStorage.setItem(SAVE_KEY,JSON.stringify(state));}else await setDoc(ref,{gameSave:state,updatedAt:Date.now()});}else await setDoc(ref,{gameSave:state,updatedAt:Date.now()});$("save-status").textContent="Sincronizado com Google ✓";render();}catch(err){console.error(err);$("save-status").textContent="Erro na nuvem • local ok";toast("Confira a configuração e as regras do Firestore.");}});$("google-login").onclick=async()=>{try{await signInWithPopup(auth,new GoogleAuthProvider());}catch(e){console.error(e);toast("Login falhou. Confira a configuração do Firebase.");}};$("google-logout").onclick=async()=>{try{await signOut(auth);toast("Você saiu da conta Google.");}catch(e){toast("Não consegui sair da conta.");}};}catch(e){console.error(e);cloudReady=false;}}
if(!configured){$("google-login").onclick=()=>toast("Configure firebase-config.js e o Firebase para ativar o login.");$("save-status").textContent="Salvo localmente • Firebase não configurado";}
renderEggs();renderCatalog();render();
setInterval(()=>{if(state.lastEvent&&Date.now()>=state.eventUntil){state.lastEvent=null;state.eventUntil=0;save();render();}else if(eventNow())render();},1000);
setInterval(()=>{maybeEvent();if(eventNow())render();},5000);
