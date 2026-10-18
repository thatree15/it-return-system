const SUPABASE_URL = 'https://dmzlwzlgoexgyjnhljhp.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_pa9uMDUxFDex0qE-nDPeYw__HHw_Q33';

let supabase = null;
var DB={emp:[],ast:[],ret:[]}, cur={items:[],chk:[]}, editNo=null;
var TYPES=['Notebook','Mouse','iPad','อื่นๆ'];

async function initSupabaseClient() {
  try {
    while (!window.supabaseCreateClient) { await new Promise(resolve => setTimeout(resolve, 50)); }
    if (!supabase && window.supabaseCreateClient) {
      supabase = window.supabaseCreateClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
  } catch(e) { console.error('Supabase Init Error:', e); }
}

var $=function(i){return document.getElementById(i)};
function tog(id,bid,t){var h=$(id).classList.toggle('hid');$(bid).textContent=(h?'แสดง':'ซ่อน')+t+(h?' ▼':' ▲')}
function toast(m){var t=$('toast');t.textContent=m;t.style.display='block';clearTimeout(t._h);t._h=setTimeout(function(){t.style.display='none'},2800)}
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function thDate(d){if(!d)return'';var p=d.split('-');return p[2]+'/'+p[1]+'/'+(+p[0]+543)}
