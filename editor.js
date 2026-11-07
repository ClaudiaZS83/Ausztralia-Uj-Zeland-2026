'use strict';
const $=id=>document.getElementById(id);
let days=[],saved=[],sha='',selected=0,busy=false;
const sections=[['Indulás és program',[['title','Nap címe'],['city','Város / helyszín'],['depart','Indulási idő / találkozó'],['route','Napi útvonal'],['notes','Napi program és tudnivalók']]],['Szállás és repülés',[['hotel','Szálloda neve'],['address','Szálloda címe'],['flight','Repülőjárat és időpontok']]]];
const keys=sections.flatMap(s=>s[1].map(f=>f[0]));

// Optional convenience on this device only. Never include a token in the site source or GitHub.
const tokenStoreKey='claudia-editor-github-token-v1';
const tokenField=$('token');
const rememberWrap=document.createElement('label');
rememberWrap.style.cssText='display:flex;align-items:flex-start;gap:10px;margin:14px 0;font-size:0.9rem;line-height:1.45;cursor:pointer';
const rememberBox=document.createElement('input');
rememberBox.type='checkbox';
rememberBox.style.cssText='width:20px;height:20px;flex-shrink:0;margin-top:2px';
const rememberText=document.createElement('span');
rememberText.textContent='Kulcs megjegyzése ezen a készüléken (kényelmesebb, de kevésbé biztonságos). Csak saját, zárolt telefonon használd.';
rememberWrap.append(rememberBox,rememberText);
tokenField.insertAdjacentElement('afterend',rememberWrap);
try{const remembered=localStorage.getItem(tokenStoreKey);if(remembered){tokenField.value=remembered;rememberBox.checked=true}}catch{}
rememberBox.addEventListener('change',()=>{if(!rememberBox.checked){try{localStorage.removeItem(tokenStoreKey)}catch{} }else if(tokenField.value.trim()){if(confirm('A GitHub-kulcsot a böngésző helyi tárhelyén tároljuk, nem titkosítva. Más, a weboldalon futó kód hozzáférhet. Biztosan megjegyezzük ezen a készüléken?')){try{localStorage.setItem(tokenStoreKey,tokenField.value.trim())}catch{alert('A készülék nem engedte a kulcs mentését.')}}else{rememberBox.checked=false}}});
function saveRememberedToken(){try{if(rememberBox.checked){localStorage.setItem(tokenStoreKey,tokenField.value.trim())}else{localStorage.removeItem(tokenStoreKey)}}catch{}}

function msg(text,error=false){$('message').textContent=text;$('message').className=error?'danger':text.startsWith('Siker')?'success':''}
function feedback(text,error=false){$('feedback').textContent=text;$('feedback').className=error?'danger':'success'}
function creds(){const owner=$('owner').value.trim(),repo=$('repo').value.trim(),token=$('token').value.trim();if(!owner||!repo||!token)throw Error('Töltsd ki mindhárom mezőt.');return{owner,repo,token}}
async function api(method,body){const {owner,repo,token}=creds();const response=await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/data.json`,{method,headers:{Accept:'application/vnd.github+json',Authorization:`Bearer ${token}`,'X-GitHub-Api-Version':'2022-11-28',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});if(!response.ok){let detail='';try{detail=(await response.json()).message||''}catch{}throw Error(`GitHub hiba (${response.status}). ${detail}`)}return response.json()}
const decode=s=>new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g,'')),c=>c.charCodeAt(0)));
function encode(s){const bytes=new TextEncoder().encode(s);let bin='';for(let i=0;i<bytes.length;i+=8192)bin+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(bin)}
function changed(){return JSON.stringify(days)!==JSON.stringify(saved)}
function mark(){const dirty=changed();$('dirtyBadge').textContent=dirty?'● Nem mentett módosítás':'Nincs változtatás';$('dirtyBadge').style.color=dirty?'#a45d00':''}
function collect(){if(!days.length)return;for(const key of keys){const field=$('field_'+key);if(field)days[selected][key]=field.value}mark()}
function render(){const d=days[selected];const root=$('fields');root.replaceChildren();for(const [heading,fields] of sections){const section=document.createElement('div');section.className='section';const h=document.createElement('h3');h.textContent=heading;section.append(h);for(const [key,label] of fields){const l=document.createElement('label');l.textContent=label;l.htmlFor='field_'+key;const el=document.createElement(['route','notes'].includes(key)?'textarea':'input');el.id='field_'+key;el.value=d[key]??'';el.addEventListener('input',collect);section.append(l,el)}root.append(section)}$('day').value=String(selected);$('prev').disabled=selected===0;$('next').disabled=selected===days.length-1;mark()}
function changeDay(index){collect();selected=Math.max(0,Math.min(days.length-1,index));render();window.scrollTo({top:0,behavior:'smooth'})}
$('day').addEventListener('change',()=>changeDay(Number($('day').value)));
$('prev').addEventListener('click',()=>changeDay(selected-1));$('next').addEventListener('click',()=>changeDay(selected+1));
$('load').addEventListener('click',async()=>{if(busy)return;busy=true;$('load').disabled=true;try{msg('Kapcsolódás…');const r=await api('GET');const data=JSON.parse(decode(r.content));if(!Array.isArray(data))throw Error('A data.json formátuma nem megfelelő.');saveRememberedToken();sha=r.sha;days=data;saved=structuredClone(data);selected=0;$('day').replaceChildren();days.forEach((d,i)=>{const opt=document.createElement('option');opt.value=i;opt.textContent=`${i+1}. nap · ${d.date||''} · ${d.city||d.title||''}`;$('day').append(opt)});render();$('editor').classList.remove('hide');$('actions').classList.remove('hide');$('loginFields').classList.add('hide');$('reconnect').classList.remove('hide');$('connectBadge').textContent='Kapcsolódva';msg('Sikeres kapcsolódás. A programok betöltődtek.')}catch(e){msg(e.message,true)}finally{busy=false;$('load').disabled=false}});
$('reconnect').addEventListener('click',()=>{if(changed()&&!confirm('Nem mentett módosításaid vannak. Biztosan újracsatlakozol?'))return;$('loginFields').classList.remove('hide');$('editor').classList.add('hide');$('actions').classList.add('hide');$('reconnect').classList.add('hide');$('connectBadge').textContent='Nincs kapcsolat';$('token').value=rememberBox.checked?(localStorage.getItem(tokenStoreKey)||''):'';days=[];saved=[];sha='';msg('Add meg a GitHub-kulcsodat a kapcsolódáshoz.')});
$('reset').addEventListener('click',()=>{collect();if(changed()&&!confirm('Biztosan visszavonod az összes nem mentett módosítást?'))return;days=structuredClone(saved);render();feedback('A nem mentett módosításokat visszavontam.')});
$('save').addEventListener('click',async()=>{if(busy)return;collect();if(!changed()){feedback('Nincs mentendő változtatás.');return}if(!confirm('Biztosan közzéteszed a módosításokat az utaskisokosban?'))return;busy=true;$('save').disabled=true;try{feedback('Mentés folyamatban…');const result=await api('PUT',{message:'Napi programok frissítése a Claudia mobil szerkesztőből',content:encode(JSON.stringify(days,null,2)+'\n'),sha,branch:'main'});sha=result.content.sha;saved=structuredClone(days);mark();feedback('Sikeresen elmentve a GitHubra! A Netlify hamarosan frissíti az utaskisokost.')}catch(e){feedback(e.message+' Ha a fájl közben megváltozott, csatlakozz újra és töltsd be a friss adatokat.',true)}finally{busy=false;$('save').disabled=false}});
window.addEventListener('beforeunload',event=>{if(days.length&&changed()){event.preventDefault();event.returnValue=''}});
