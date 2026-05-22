import { escapeHTML } from '../../lib/utils.js';

export function frontAdminScript() {
  return `
  const frontAdminModal=document.getElementById('frontAdminEditModal');
  function frontAdminClose(){frontAdminModal?.classList.add('opacity-0','invisible')}
  function frontAdminOpen(){frontAdminModal?.classList.remove('opacity-0','invisible')}
  document.getElementById('frontAdminCloseEdit')?.addEventListener('click',frontAdminClose);
  document.getElementById('frontAdminCancelEdit')?.addEventListener('click',frontAdminClose);
  frontAdminModal?.addEventListener('click',(e)=>{if(e.target===frontAdminModal)frontAdminClose()});

  document.querySelectorAll('.front-edit-btn').forEach(btn=>btn.addEventListener('click',function(e){
    e.preventDefault();
    e.stopPropagation();
    const id=this.dataset.id;
    if(!id)return;
    this.disabled=true;
    const originalText=this.textContent;
    this.textContent='加载中';
    fetch('/api/config/'+encodeURIComponent(id)).then(r=>r.json()).then(d=>{
      if(d.code!==200||!d.data)throw new Error(d.message||'读取书签失败');
      const c=d.data;
      document.getElementById('frontAdminEditId').value=c.id||'';
      document.getElementById('frontAdminEditName').value=c.name||'';
      document.getElementById('frontAdminEditUrl').value=c.url||'';
      document.getElementById('frontAdminEditLogo').value=c.logo||'';
      document.getElementById('frontAdminEditDesc').value=c.desc||'';
      document.getElementById('frontAdminEditCatelog').value=c.catelog||'';
      document.getElementById('frontAdminEditTags').value=Array.isArray(c.tags)?c.tags.join(', '):'';
      document.getElementById('frontAdminEditSortOrder').value=Number(c.sort_order)===9999?'':(c.sort_order||'');
      frontAdminOpen();
    }).catch(err=>alert(err.message||'读取书签失败')).finally(()=>{
      this.disabled=false;
      this.textContent=originalText;
    });
  }));

  document.querySelectorAll('.front-delete-btn').forEach(btn=>btn.addEventListener('click',function(e){
    e.preventDefault();
    e.stopPropagation();
    const id=this.dataset.id;
    const name=this.dataset.name||'该书签';
    if(!id||!confirm('确认删除“'+name+'”？此操作不可恢复。'))return;
    this.disabled=true;
    this.textContent='删除中';
    fetch('/api/config/'+encodeURIComponent(id),{method:'DELETE'}).then(r=>r.json()).then(d=>{
      if(d.code===200){
        localStorage.setItem('nav:front-refresh',JSON.stringify({reason:'front-admin-deleted',time:Date.now()}));
        window.location.reload();
      }else{
        alert(d.message||'删除失败');
        this.disabled=false;
        this.textContent='删除';
      }
    }).catch(()=>{
      alert('网络错误，删除失败');
      this.disabled=false;
      this.textContent='删除';
    });
  }));

  document.getElementById('frontAdminEditForm')?.addEventListener('submit',function(e){
    e.preventDefault();
    const id=document.getElementById('frontAdminEditId').value;
    const sort=document.getElementById('frontAdminEditSortOrder').value;
    const payload={
      name:document.getElementById('frontAdminEditName').value.trim(),
      url:document.getElementById('frontAdminEditUrl').value.trim(),
      logo:document.getElementById('frontAdminEditLogo').value.trim(),
      desc:document.getElementById('frontAdminEditDesc').value.trim(),
      catelog:document.getElementById('frontAdminEditCatelog').value.trim(),
      tags:document.getElementById('frontAdminEditTags').value.trim()
    };
    if(sort!=='')payload.sort_order=Number(sort);
    if(!payload.name||!payload.url||!payload.catelog){alert('名称、网址、分类不能为空');return;}
    const submitBtn=this.querySelector('button[type="submit"]');
    const originalText=submitBtn?.textContent||'保存修改';
    if(submitBtn){submitBtn.disabled=true;submitBtn.textContent='保存中...';}
    fetch('/api/config/'+encodeURIComponent(id),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}).then(r=>r.json()).then(d=>{
      if(d.code===200){
        localStorage.setItem('nav:front-refresh',JSON.stringify({reason:'front-admin-updated',time:Date.now()}));
        window.location.reload();
      }else{
        alert(d.message||'保存失败');
      }
    }).catch(()=>alert('网络错误，保存失败')).finally(()=>{
      if(submitBtn){submitBtn.disabled=false;submitBtn.textContent=originalText;}
    });
  });
  `;
}

export function dragScript(i18n = null) {
  const saveDragSortText = escapeHTML(i18n?.t?.('saveDragSort') || '保存拖拽排序');
  return `
  const saveBtn=document.getElementById('saveOrderBtn');let dragged=null,dirty=false,lastDragY=0,autoScrollTimer=null;
  function startAutoScroll(){
    if(autoScrollTimer)return;
    autoScrollTimer=setInterval(()=>{
      if(!dragged)return;
      const edge=80;
      const maxSpeed=22;
      let delta=0;
      if(lastDragY<edge){
        delta=-Math.max(6,Math.round((edge-lastDragY)/edge*maxSpeed));
      }else if(window.innerHeight-lastDragY<edge){
        delta=Math.max(6,Math.round((edge-(window.innerHeight-lastDragY))/edge*maxSpeed));
      }
      if(delta!==0)window.scrollBy({top:delta,left:0,behavior:'auto'});
    },16);
  }
  function stopAutoScroll(){
    if(autoScrollTimer){clearInterval(autoScrollTimer);autoScrollTimer=null;}
  }
  document.addEventListener('dragover',(e)=>{lastDragY=e.clientY;});
  document.querySelectorAll('.site-card').forEach(card=>{
    card.addEventListener('dragstart',(e)=>{dragged=card;lastDragY=e.clientY||0;card.classList.add('dragging');startAutoScroll();console.log('[drag] start site='+card.dataset.id)});
    card.addEventListener('dragend',()=>{card.classList.remove('dragging');document.querySelectorAll('.drag-over').forEach(i=>i.classList.remove('drag-over'));stopAutoScroll();dragged=null;});
    card.addEventListener('dragover',(e)=>{e.preventDefault();lastDragY=e.clientY;card.classList.add('drag-over')});
    card.addEventListener('dragleave',()=>card.classList.remove('drag-over'));
    card.addEventListener('drop',(e)=>{e.preventDefault();lastDragY=e.clientY;card.classList.remove('drag-over');if(!dragged||dragged===card)return;const grid=document.getElementById('sitesGrid');const cards=[...grid.querySelectorAll('.site-card:not(.hidden)')];const from=cards.indexOf(dragged),to=cards.indexOf(card);console.log('[drag] drop from='+from+' to='+to);if(from<to)card.after(dragged);else card.before(dragged);dirty=true;saveBtn.disabled=false;stopAutoScroll();dragged=null;});
  });
  saveBtn?.addEventListener('click',()=>{const items=[...document.querySelectorAll('#sitesGrid .site-card:not(.hidden)')].map((card,i)=>({id:Number(card.dataset.id),sort_order:(i+1)*10}));console.log('[drag] save count='+items.length);saveBtn.disabled=true;saveBtn.textContent='保存中...';fetch('/api/config/reorder',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items})}).then(r=>r.json()).then(d=>{if(d.code===200){dirty=false;saveBtn.textContent='已保存';setTimeout(()=>saveBtn.textContent='${saveDragSortText}',1200)}else{alert(d.message||'保存失败');saveBtn.disabled=false;saveBtn.textContent='${saveDragSortText}'}}).catch(()=>{alert('网络错误');saveBtn.disabled=false;saveBtn.textContent='${saveDragSortText}'});});
  `;
}

export function myUsageScript() {
  return `
  (function(){
    var FAV_KEY='nav:favorites',RECENT_KEY='nav:recent-visits',MAX_FAV=24,MAX_RECENT=12;
    var usageSection=document.getElementById('myUsageSection');
    var siteIndex=Array.isArray(window.__SITE_INDEX__)?window.__SITE_INDEX__:[];
    var siteMap=new Map(siteIndex.map(function(s){return[String(s.id),s]}));
    function readJson(key){try{var v=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(v)?v:[]}catch(e){return[]}}
    function writeJson(key,arr){try{localStorage.setItem(key,JSON.stringify(arr.slice(0,key===FAV_KEY?MAX_FAV:MAX_RECENT)))}catch(e){}}
    function getFavIds(){return readJson(FAV_KEY).map(String)}
    function setFavIds(ids){writeJson(FAV_KEY,[...new Set(ids.map(String))])}
    function isFav(id){return getFavIds().includes(String(id))}
    function toggleFav(id){var ids=getFavIds(),sid=String(id),idx=ids.indexOf(sid);if(idx>=0)ids.splice(idx,1);else ids.unshift(sid);setFavIds(ids);return ids.includes(sid)}
    function getRecentIds(){return readJson(RECENT_KEY).filter(function(item){return item&&item.id}).map(function(item){return String(item.id)})}
    function addRecentId(id){if(!id)return;var sid=String(id),now=Date.now();var list=readJson(RECENT_KEY).filter(function(item){return String(item&&item.id)!==sid});list.unshift({id:sid,time:now});writeJson(RECENT_KEY,list);renderUsage()}
    function clearUsage(key){localStorage.removeItem(key);renderUsage();syncFavStates()}
    function renderChips(container,ids,onRemove){if(!container)return 0;container.innerHTML='';var count=0;ids.forEach(function(id){var site=siteMap.get(String(id));if(!site)return;count++;var chip=document.createElement('a');chip.className='usage-chip';chip.href=site.id?'/go/'+encodeURIComponent(site.id):(site.url||'#');if(site.url){chip.target='_blank';chip.rel='noopener noreferrer'}chip.title=(site.name||'')+(site.catelog?' \\u00b7 '+site.catelog:'');chip.dataset.siteId=String(site.id);if(site.logo){var img=document.createElement('img');img.src=site.logo;img.alt='';img.className='h-3 w-3 rounded';chip.appendChild(img)}var label=document.createElement('span');label.textContent=site.name||'\\u672a\\u547d\\u540d';label.className='truncate';chip.appendChild(label);var remove=document.createElement('span');remove.className='chip-remove';remove.textContent='\\u00d7';remove.title='\\u79fb\\u9664';remove.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();onRemove(String(site.id))});chip.appendChild(remove);container.appendChild(chip)});return count}
    function renderUsage(){if(!usageSection)return;var favIds=getFavIds(),recentIds=getRecentIds();var favCount=renderChips(usageSection.querySelector('[data-usage-list="favorites"]'),favIds,function(id){var ids=getFavIds().filter(function(x){return x!==id});setFavIds(ids);renderUsage();syncFavStates()});var recentCount=renderChips(usageSection.querySelector('[data-usage-list="recent"]'),recentIds,function(id){var list=readJson(RECENT_KEY).filter(function(item){return String(item&&item.id)!==id});writeJson(RECENT_KEY,list);renderUsage()});usageSection.classList.toggle('hidden',(favCount||0)===0&&(recentCount||0)===0)}
    function injectFavButton(card){if(!card||card.querySelector('.fav-btn'))return;var id=card.dataset.id;if(!id)return;var btn=document.createElement('button');btn.type='button';btn.className='fav-btn'+(isFav(id)?' is-fav':'');btn.dataset.siteId=id;btn.setAttribute('aria-label','\\u6536\\u85cf');btn.textContent=isFav(id)?'\\u2605':'\\u2606';btn.title=isFav(id)?'\\u53d6\\u6d88\\u6536\\u85cf':'\\u52a0\\u5165\\u6536\\u85cf';btn.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();var nowFav=toggleFav(id);btn.textContent=nowFav?'\\u2605':'\\u2606';btn.classList.toggle('is-fav',nowFav);btn.title=nowFav?'\\u53d6\\u6d88\\u6536\\u85cf':'\\u52a0\\u5165\\u6536\\u85cf';renderUsage()});card.appendChild(btn)}
    function syncFavStates(){document.querySelectorAll('.site-card .fav-btn').forEach(function(btn){var id=btn.dataset.siteId;if(!id)return;var fav=isFav(id);btn.textContent=fav?'\\u2605':'\\u2606';btn.classList.toggle('is-fav',fav);btn.title=fav?'\\u53d6\\u6d88\\u6536\\u85cf':'\\u52a0\\u5165\\u6536\\u85cf'})}
    function injectAllFavButtons(){document.querySelectorAll('.site-card[data-id]').forEach(injectFavButton)}
    injectAllFavButtons();
    renderUsage();
    var gridEl=document.getElementById('sitesGrid');
    if(gridEl&&typeof MutationObserver!=='undefined'){new MutationObserver(function(){injectAllFavButtons()}).observe(gridEl,{childList:true,subtree:false})}
    document.body.addEventListener('click',function(e){var link=e.target.closest('a[href]');if(!link)return;var card=link.closest('.site-card[data-id]');if(card){var id=card.dataset.id;if(id&&link.getAttribute('href')!=='#'&&!link.classList.contains('fav-btn')){addRecentId(id)}return}var chip=e.target.closest('.usage-chip[data-site-id]');if(chip&&!e.target.closest('.chip-remove')){addRecentId(chip.dataset.siteId)}});
    if(usageSection){usageSection.querySelectorAll('[data-usage-clear]').forEach(function(btn){btn.addEventListener('click',function(){clearUsage(btn.dataset.usageClear==='favorites'?FAV_KEY:RECENT_KEY)})})}
    window.addEventListener('storage',function(e){if(e.key===FAV_KEY||e.key===RECENT_KEY){renderUsage();syncFavStates()}});
  })();
  `;
}