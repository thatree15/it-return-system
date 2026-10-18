document.querySelectorAll('#nav button').forEach(function(b){b.onclick=function(){
 document.querySelectorAll('#nav button,.tab').forEach(function(x){x.classList.remove('on')});
 b.classList.add('on');$('t-'+b.dataset.t).classList.add('on');$('acts').style.display=b.dataset.t=='form'?'':'none';
 if(b.dataset.t=='hist')rHist();if(b.dataset.t=='ast')rAst();if(b.dataset.t=='emp')rEmp();if(b.dataset.t=='rep')rRep()}});

async function fetchHistory(){
  if(!supabase) return;
  toast('กำลังซิงค์ข้อมูลทั้งหมดจาก Cloud...');
  try {
    var resRet = await supabase.from('returns').select('*, return_items(*)');
    var resEmp = await supabase.from('employees').select('*');
    var resAst = await supabase.from('assets').select('*');
    if(resRet.error) throw resRet.error; if(resEmp.error) throw resEmp.error; if(resAst.error) throw resAst.error;

    DB.emp = (resEmp.data || []).map(function(e){ return { EmployeeNo: e.employee_no, EmployeeNameTH: e.employee_name_th, GroupCode: e.group_code, GroupNameTH: e.group_name_th, Mobile: e.mobile, EMail: e.email }; });
    DB.ast = (resAst.data || []).map(function(a){ return { asset_id: a.asset_id, category: a.category, brand_Series: a.brand_series, serial_no: a.serial_no }; });
    DB.ret = (resRet.data || []).map(function(r){
      return {
        no: r.no, loc: r.loc, date: r.date, eId: r.e_id, eName: r.e_name, dept: r.dept, phone: r.phone, mail: r.mail, pmail: r.pmail, it: r.it_staff,
        chk: r.chk || [], rem: r.rem, sE: r.s_e, sI: r.s_i, ver: r.ver,
        items: (r.return_items || []).map(function(i){ return { type: i.type, code: i.code, brand: i.brand, sn: i.sn, st: i.st }; })
      };
    });
    lists(); rHist(); rAst(); rEmp();
    toast('ดาวน์โหลดข้อมูลจาก Cloud สมบูรณ์แล้ว');
  } catch(e) { toast('โหลดข้อมูลล้มเหลว: ' + e.message); }
}

async function saveToDatabase(rec){
  if(!supabase) return false;
  var res1 = await supabase.from('returns').upsert({
    no: rec.no, loc: rec.loc, date: rec.date, e_id: rec.eId, e_name: rec.eName,
    dept: rec.dept, phone: rec.phone, mail: rec.mail, pmail: rec.pmail, it_staff: rec.it,
    chk: rec.chk, rem: rec.rem, s_e: rec.sE, s_i: rec.sI, ver: rec.ver
  });
  if(res1.error){ toast('บันทึกผิดพลาด: ' + res1.error.message); return false; }

  await supabase.from('return_items').delete().eq('no', rec.no);
  var itemsToInsert = rec.items.map(function(i){ return { no: rec.no, type: i.type, code: i.code, brand: i.brand, sn: i.sn, st: i.st }; });
  var res2 = await supabase.from('return_items').insert(itemsToInsert);
  if(res2.error){ toast('บันทึกอุปกรณ์ผิดพลาด: ' + res2.error.message); return false; }
  return true;
}

function pad(id){var c=$(id),x=c.getContext('2d'),d=false;x.lineWidth=2.5;x.lineCap='round';
 function p(e){var r=c.getBoundingClientRect();return[(e.clientX-r.left)*c.width/r.width,(e.clientY-r.top)*c.height/r.height]}
 c.onpointerdown=function(e){d=true;var a=p(e);x.beginPath();x.moveTo(a[0],a[1]);c.setPointerCapture(e.pointerId)};
 c.onpointermove=function(e){if(!d)return;var a=p(e);x.lineTo(a[0],a[1]);x.stroke()};
 c.onpointerup=c.onpointercancel=function(){d=false}}
function clr(id){var c=$(id);c.getContext('2d').clearRect(0,0,c.width,c.height)}
function blank(id){var c=$(id),b=document.createElement('canvas');b.width=c.width;b.height=c.height;return c.toDataURL()===b.toDataURL()}
function draw(id,u){clr(id);if(!u)return;var i=new Image();i.onload=function(){$(id).getContext('2d').drawImage(i,0,0)};i.src=u}

async function nextNo(){
  var d = $('date').value.replace(/-/g,''), l = $('loc').value, m = 0;
  if (supabase) {
    var { data } = await supabase.from('returns').select('no');
    if (data && data.length > 0) {
      data.forEach(function(r) {
        var parts = String(r.no).split('-');
        var lastPart = parts[parts.length - 1];
        var n = parseInt(lastPart.slice(1), 10);
        if (!isNaN(n) && n > m) m = n;
      });
    }
  }
  return 'IT-RE' + d + '-' + l + String(m + 1).padStart(4, '0');
}

function refNo(){ tags(); }

function newDoc(){
  editNo = null; cur = {items:[], chk:[]}; $('no').value = '';
  ['eName','eId','eDept','ePhone','eMail','ePMail','rem'].forEach(function(i){$(i).value=''});
  $('date').value = new Date().toISOString().slice(0,10); $('it').value = '';
  clr('sE'); clr('sI');
  for(var i=0; i<3; i++) cur.items.push({type:'', code:'', brand:'', sn:'', st:'ปกติ'});
  cur.chk = ['','','']; rItems(); rChk(); lists(); refNo();
}

function rItems(){
  var usedCodes = {};
  cur.items.forEach(function(it){ if(it.code) usedCodes[it.code] = true; });
  var availableAst = DB.ast.filter(function(a){
    var isUsedInHistory = DB.ret.some(function(r){
      if(editNo && r.no === editNo) return false;
      return (r.items || []).some(function(i){ return i.code === a.asset_id; });
    });
    return !isUsedInHistory;
  });

  $('items').innerHTML=cur.items.map(function(r,i){
    var rowOptions = availableAst.filter(function(a){ return !usedCodes[a.asset_id] || a.asset_id === r.code; });
    return '<tr><td>'+(i+1)+'</td><td><select onchange="cur.items['+i+'].type=this.value;tags()"><option></option>'+TYPES.map(function(t){return '<option'+(r.type==t?' selected':'')+'>'+t+'</option>'}).join('')+(r.type&&TYPES.indexOf(r.type)<0?'<option selected>'+esc(r.type)+'</option>':'')+'</select></td>'+
 '<td><input list="astl_'+i+'" value="'+esc(r.code)+'" onchange="pick('+i+',this.value)" placeholder="พิมพ์หรือเลือกรหัส"><datalist id="astl_'+i+'">'+rowOptions.map(function(a){return '<option value="'+esc(a.asset_id)+'">'+esc(a.brand_Series)+' ('+esc(a.serial_no)+')</option>'}).join('')+'</datalist></td>'+
 '<td><input value="'+esc(r.brand)+'" oninput="cur.items['+i+'].brand=this.value;tags()"></td><td><input value="'+esc(r.sn)+'" oninput="cur.items['+i+'].sn=this.value;tags()"></td>'+
 '<td><select onchange="cur.items['+i+'].st=this.value;tags()">'+['ปกติ','ชำรุด','สูญหาย','รอส่งคืน'].map(function(s){return '<option'+(r.st==s?' selected':'')+'>'+s+'</option>'}).join('')+'</select></td><td class="np"><button class="b d" onclick="delItem('+i+')">ลบ</button></td></tr>';
  }).join('');
}

function addItem(){cur.items.push({type:'',code:'',brand:'',sn:'',st:'ปกติ'});rItems();tags()}
function delItem(i){if(cur.items.length<2)return toast('ต้องมีอย่างน้อย 1 รายการ');cur.items.splice(i,1);rItems();tags()}

function pick(i,v){
  var r=cur.items[i]; v = v.trim();
  var isUsed = DB.ret.some(function(doc){
    if(editNo && doc.no === editNo) return false;
    return (doc.items || []).some(function(item){ return item.code === v; });
  });

  if(isUsed && v !== '') { toast('รหัสอุปกรณ์ "' + v + '" นี้เคยถูกบันทึกส่งคืนไปแล้ว ไม่สามารถเลือกซ้ำได้'); r.code = ''; r.brand = ''; r.sn = ''; rItems(); tags(); return; }
  r.code=v; var a=DB.ast.filter(function(x){return x.asset_id==v})[0];
  if(a){ r.brand=a.brand_Series||''; r.sn=a.serial_no||''; if(!r.type){ var c=String(a.category||'').toLowerCase(); r.type=/note|lap/.test(c)?'Notebook':/mouse/.test(c)?'Mouse':/ipad|tab/.test(c)?'iPad':(a.category||''); } }
  rItems();tags();
}

function rChk(){$('chk').innerHTML=cur.chk.map(function(v,i){return '<div class="row" style="margin:4px 0"><span>'+(i+1)+'</span><input style="flex:1" value="'+esc(v)+'" oninput="cur.chk['+i+']=this.value"><button class="b d np" onclick="cur.chk.splice('+i+',1);rChk()">ลบ</button></div>'}).join('')}
function addChk(){cur.chk.push('');rChk()}
function tags(){sig();$('tags').innerHTML=cur.items.map(function(r,i){return '<div class="tag"><div class="th"><b>ป้ายที่ '+(i+1)+'</b><span>เลขที่ '+esc($('no').value||'--------')+'</span></div><div class="tg">'+[['ผู้ส่งคืน',$('eName').value],['รหัสอุปกรณ์',r.code],['รายการ',r.type],['ยี่ห้อ/รุ่น',r.brand],['Serial No.',r.sn],['วันที่รับคืน',thDate($('date').value)],['ผู้รับมอบ (IT)',$('it').value]].map(function(f){return '<div class="tf"><span>'+f[0]+'</span><b>'+(esc(f[1])||'&nbsp;')+'</b></div>'}).join('')+'</div><div class="ts"><span>สถานะ</span><span>☐ รอตรวจสอบ</span><span>☐ HR ตรวจสอบแล้ว</span><span>☐ ส่งคืนข้อมูลแล้ว</span></div></div>'}).join('')}
function fillEmp(){
  var v = $('eName').value.trim(), e = DB.emp.filter(function(x){ return x.EmployeeNo === v || x.EmployeeNameTH === v || (x.EmployeeNo + ' - ' + x.EmployeeNameTH) === v; })[0];
  if(e){ $('eName').value = e.EmployeeNameTH || ''; $('eId').value = e.EmployeeNo || ''; $('eDept').value = e.GroupNameTH || ''; $('ePhone').value = e.Mobile || ''; $('eMail').value = e.EMail || ''; }
  tags();
}

function lists(){
  $('empl').innerHTML=DB.emp.slice(0,400).map(function(e){return '<option value="'+esc(e.EmployeeNameTH)+'">'+esc(e.EmployeeNo)+'</option>'}).join('');
  var v=$('it').value,isIT=function(e){return String(e.GroupCode==null?'':e.GroupCode).trim().toUpperCase()=='IT'},it=DB.emp.filter(isIT),op=function(e){return '<option value="'+esc(e.EmployeeNameTH)+'">'+esc(e.EmployeeNameTH)+'</option>'};
  $('it').innerHTML='<option value="">-- เลือกผู้รับมอบ --</option>'+(it.length?'<optgroup label="เจ้าหน้าที่ IT">'+it.map(op).join('')+'</optgroup>':'')+(it.length?'':'<option value="" disabled>ไม่พบพนักงานที่ GroupCode = IT</option>');setIT(v);
  rItems();
}

function setIT(n){if(!n||n=='__m'){$('it').value='';return}var f=false;Array.from($('it').options).forEach(function(o){if(o.value==n)f=true});if(!f){var o=document.createElement('option');o.value=o.textContent=n;$('it').appendChild(o)}$('it').value=n}
function itChange(){if($('it').value=='__m'){var n=prompt('พิมพ์ชื่อผู้รับมอบ');if(n&&n.trim())setIT(n.trim());else $('it').value=''}tags()}
function sig(){var n=$('eName').value.trim(),d=thDate($('date').value)||'........../........../..........',dots='.............................';$('sEn').textContent=n||dots;$('sEi').value=n;$('sEd').textContent=d;$('sIn').textContent=$('it').value||dots;$('sId').textContent=d}

async function save(){
  if(!$('eName').value.trim()) return toast('กรุณาระบุชื่อพนักงาน');
  var items = cur.items.filter(function(r){return r.type||r.code||r.brand||r.sn});
  if(!items.length) return toast('กรุณากรอกอุปกรณ์อย่างน้อย 1 รายการ');

  for(var i=0; i<items.length; i++) {
    var code = items[i].code;
    if(code) {
      var isUsed = DB.ret.some(function(doc){
        if(editNo && doc.no === editNo) return false;
        return (doc.items || []).some(function(item){ return item.code === code; });
      });
      if(isUsed) return toast('รหัสอุปกรณ์ "' + code + '" ในรายการที่ ' + (i+1) + ' เคยถูกบันทึกส่งคืนไปแล้ว ไม่สามารถบันทึกซ้ำได้');
    }
  }
  
  toast('กำลังตรวจสอบเลขที่เอกสารและบันทึกข้อมูลไปที่ Cloud...');
  var no = $('no').value;
  if (!editNo || !no) { no = await nextNo(); $('no').value = no; }

  var rec = {
    no: no, loc: $('loc').value=='1'?'Ploenchit':'Remix', date: $('date').value,
    eId: $('eId').value, eName: $('eName').value, dept: $('eDept').value, phone: $('ePhone').value,
    mail: $('eMail').value, pmail: $('ePMail').value, it: $('it').value,
    items: items, chk: cur.chk.filter(Boolean), rem: $('rem').value,
    sE: blank('sE')?'':$('sE').toDataURL(), sI: blank('sI')?'':$('sI').toDataURL(), ver: false
  };

  var ok = await saveToDatabase(rec);
  if(ok){
    DB.ret = DB.ret.filter(function(r){return r.no!=no}); DB.ret.push(rec);
    toast('บันทึกเอกสาร '+no+' ลงคลาวด์เรียบร้อยแล้ว');
    editNo = no; $('no').value = no; lists(); tags();
  } else {
    toast('เลขเอกสารนี้อาจถูกใช้งานไปแล้ว ระบบกำลังสุ่มรันเลขใหม่ให้');
    var newGenNo = await nextNo(); $('no').value = newGenNo; save();
  }
}

var FSOK=('showDirectoryPicker' in window);
function idb(){return new Promise(function(res,rej){var r=indexedDB.open('itret-fs',1);r.onupgradeneeded=function(){r.result.createObjectStore('h')};r.onsuccess=function(){res(r.result)};r.onerror=function(){rej(r.error)}})}
async function hGet(){try{var d=await idb();return await new Promise(function(res){var q=d.transaction('h').objectStore('h').get('dir');q.onsuccess=function(){res(q.result||null)};q.onerror=function(){res(null)}})}catch(e){return null}}
async function hSet(v){try{var d=await idb();await new Promise(function(res){var t=d.transaction('h','readwrite');if(v)t.objectStore('h').put(v,'dir');else t.objectStore('h').delete('dir');t.oncomplete=t.onerror=res})}catch(e){}}
function dirLabel(n){var e=$('dirName');if(e)e.textContent=n||'ยังไม่ได้กำหนด'}
async function getDir(askNew){if(!FSOK)return null;try{var h=await hGet(),o={mode:'readwrite'};if(h&&!askNew){if((await h.queryPermission(o))=='granted'||(await h.requestPermission(o))=='granted')return h}
 h=await showDirectoryPicker({id:'itreturn',mode:'readwrite'});await hSet(h);dirLabel(h.name);return h}catch(e){if(e&&e.name=='AbortError')throw e;FSOK=false;toast('เบราว์เซอร์ไม่อนุญาตให้เลือกโฟลเดอร์ในหน้านี้');return null}}
async function chDir(){try{await getDir(true)}catch(e){}}
async function clrDir(){await hSet(null);dirLabel('');toast('ล้างค่าโฟลเดอร์แล้ว')}

function printDoc(){if(!$('eName').value.trim())return toast('กรุณาระบุชื่อพนักงานก่อน');var pa=$('pa'),ok=false;pa.innerHTML=docHTML('ฉบับที่ 1 เก็บโดยฝ่ายไอที (ผู้รับ)')+docHTML('ฉบับที่ 2 เก็บโดยพนักงานผู้ส่งคืน')+tagsHTML();
 var onb=function(){ok=true},cl=function(){document.body.classList.remove('pm');pa.innerHTML='';window.removeEventListener('beforeprint',onb);window.removeEventListener('afterprint',cl)};
 window.addEventListener('beforeprint',onb);window.addEventListener('afterprint',cl);document.body.classList.add('pm');
 try{window.print()}catch(e){} setTimeout(function(){if(!ok){cl();toast('เบราว์เซอร์บล็อกการสั่งพิมพ์ สร้าง PDF ให้แทน');printForm()}},700)}
async function toPdf(el,name){var dir=null;try{dir=await getDir(false)}catch(e){return toast('ยกเลิกการบันทึก PDF')}toast('กำลังสร้าง PDF กรุณารอสักครู่...');var o={margin:[8,10,8,8],filename:name,image:{type:'jpeg',quality:.95},html2canvas:{scale:2,useCORS:true},jsPDF:{unit:'mm',format:'a4',orientation:'portrait'},pagebreak:{mode:['css','legacy'],avoid:'.tag'}};
 try{var w=html2pdf().set(o).from(el);if(dir){var b0=await w.outputPdf('blob'),fh=await dir.getFileHandle(name,{create:true}),ws=await fh.createWritable();await ws.write(b0);await ws.close();toast('บันทึก '+name+' ลงโฟลเดอร์ '+dir.name+' แล้ว')}else await w.save()}catch(e){toast('สร้าง PDF ไม่สำเร็จ')}}
function docHTML(copy){var C='border:1px solid #888;padding:4px 6px;text-align:left;',T='width:100%;border-collapse:collapse;',H=function(t){return '<div style="background:#e8f0fb;color:#1d4f91;font-weight:700;padding:3px 8px;margin:10px 0 6px;border-left:4px solid #1d4f91">'+t+'</div>'},
 sg=function(id){return blank(id)?'<div style="height:64px"></div>':'<img src="'+$(id).toDataURL()+'" style="height:64px;display:block">'}, it=cur.items.filter(function(r){return r.type||r.code||r.brand||r.sn}),ck=cur.chk.filter(Boolean),d=thDate($('date').value), ev=function(a,b){return '<td style="'+C+'width:17%;background:#f4f6f9">'+a+'</td><td style="'+C+'width:33%">'+esc(b)+'</td>'};
 return '<div style="width:700px;background:#fff;color:#000;font-family:Sarabun,sans-serif;font-size:13px;line-height:1.6;page-break-after:always"><div style="text-align:center;border-bottom:2px solid #1d4f91;padding-bottom:4px"><div style="font-size:20px;font-weight:700">แบบฟอร์มส่งคืนอุปกรณ์ไอที</div><div>IT Equipment Return Form</div></div><p style="margin:8px 0">สถานที่: <b>'+esc($('loc').selectedOptions[0].text)+'</b> &nbsp;|&nbsp; เลขที่เอกสาร: <b>'+esc($('no').value||'--------')+'</b> &nbsp;|&nbsp; วันที่ส่งมอบ: <b>'+d+'</b><br>'+copy+'</p>'+H('ส่วนที่ 1 ข้อมูลพนักงาน')+'<table style="'+T+'"><tr>'+ev('ชื่อ-นามสกุล',$('eName').value)+ev('รหัสพนักงาน',$('eId').value)+'</tr><tr>'+ev('แผนก',$('eDept').value)+ev('เบอร์โทร',$('ePhone').value)+'</tr><tr>'+ev('อีเมลบริษัท',$('eMail').value)+ev('อีเมลส่วนตัว',$('ePMail').value)+'</tr></table>'+H('ส่วนที่ 2 รายการอุปกรณ์ที่ส่งคืน')+'<table style="'+T+'"><tr>'+['ลำดับ','รายการ','รหัสอุปกรณ์','ยี่ห้อ/รุ่น','Serial Number','สภาพ'].map(function(h){return '<th style="'+C+'background:#f4f6f9">'+h+'</th>'}).join('')+'</tr>'+it.map(function(r,i){return '<tr>'+[i+1,r.type,r.code,r.brand,r.sn,r.st].map(function(v){return '<td style="'+C+'">'+esc(v)+'</td>'}).join('')+'</tr>'}).join('')+'</table>'+H('ส่วนที่ 3 รายการตรวจสอบข้อมูล')+'<div>'+(ck.length?ck.map(function(c,i){return (i+1)+'. '+esc(c)}).join('<br>'):'-')+'</div><div style="color:#b42318;margin-top:6px">บริษัทฯ จะดำเนินการตรวจสอบข้อมูลแล้วจะแจ้งผ่านทางอีเมลภายใน 30 วัน</div><div style="margin-top:4px">หมายเหตุ: '+esc($('rem').value)+'</div>'+H('ส่วนที่ 4 การยืนยันและลงนาม')+'<div>ข้าพเจ้าขอยืนยันว่าได้ส่งมอบอุปกรณ์ตามรายการข้างต้นครบถ้วน และผู้รับได้ตรวจสอบรายการและสภาพอุปกรณ์เบื้องต้นร่วมกันแล้ว</div><table style="'+T+'margin-top:8px"><tr>'+[['ผู้ส่งคืน (พนักงาน)','sE',$('eName').value],['ผู้รับมอบ (ฝ่ายไอที)','sI',$('it').value]].map(function(s){return '<td style="width:50%;padding:6px;vertical-align:bottom"><b>'+s[0]+'</b>'+sg(s[1])+'<div style="border-top:1px solid #000;padding-top:3px">ชื่อ: ( '+esc(s[2])+' )<br>วันที่: '+d+'</div></td>'}).join('')+'</tr></table></div>'}
function tagsHTML(){tags();var c=$('tags').children,g=[],i;for(i=0;i<c.length;i++){var k=Math.floor(i/4);g[k]=(g[k]||'')+c[i].outerHTML} return '<div style="width:700px;background:#fff;color:#000;--ink:#000;--mut:#555;--line:#ccc;--bg:#fff;font-family:Sarabun,sans-serif"><style>.tg{grid-template-columns:repeat(2,minmax(0,1fr))!important}</style><div style="font-weight:700;color:#1d4f91;margin-bottom:4px">ส่วนที่ 5 ป้ายติดเครื่อง</div>'+g.map(function(x,k){return '<div'+(k<g.length-1?' style="page-break-after:always"':'')+'>'+x+'</div>'}).join('')+'</div>'}
function printForm(){if(!$('eName').value.trim())return toast('กรุณาระบุชื่อพนักงานก่อน');var d=document.createElement('div');d.innerHTML=docHTML('ฉบับที่ 1 เก็บโดยฝ่ายไอที (ผู้รับ)')+docHTML('ฉบับที่ 2 เก็บโดยพนักงานผู้ส่งคืน')+tagsHTML();toPdf(d,($('no').value||'IT-Return')+'.pdf')}

function rHist(){var q=$('hq').value.toLowerCase(); var rows=DB.ret.slice().sort(function(a,b){return a.no<b.no?1:-1}).filter(function(r){return !q||(r.no+r.eName+r.items.map(function(i){return i.code}).join(' ')).toLowerCase().indexOf(q)>=0});
 $('hT').innerHTML='<tr><th>เลขที่</th><th>วันที่</th><th>พนักงาน</th><th>อุปกรณ์</th><th>ตรวจสอบแล้ว</th><th></th></tr>'+rows.map(function(r){return '<tr><td>'+esc(r.no)+'</td><td>'+thDate(r.date)+'</td><td>'+esc(r.eName)+'</td><td>'+r.items.length+'</td><td><input type="checkbox" style="min-height:0;width:20px" '+(r.ver?'checked':'')+' onchange="ver(\''+r.no+'\',this.checked)"></td><td><button class="b s" onclick="openDoc(\''+r.no+'\')">เปิด/แก้ไข</button> <button class="b d" onclick="delDoc(\''+r.no+'\')">ลบ</button></td></tr>'}).join('')}
async function ver(n,v){ await initSupabaseClient(); if(!supabase) return; DB.ret.forEach(function(r){if(r.no==n)r.ver=v}); await supabase.from('returns').update({ ver: v }).eq('no', n); }
function ask(m,ok){var d=document.createElement('div');d.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:30;display:flex;align-items:center;justify-content:center;padding:16px';d.innerHTML='<div class="card" style="max-width:360px;margin:0"><p>'+esc(m)+'</p><div class="row"><button class="b d" id="ay">ยืนยัน</button><button class="b s" id="an">ยกเลิก</button></div></div>';document.body.appendChild(d);d.querySelector('#ay').onclick=function(){d.remove();ok()};d.querySelector('#an').onclick=function(){d.remove()}}
async function delDoc(n){ask('ลบเอกสาร '+n+' ใช่หรือไม่?', async function(){ await initSupabaseClient(); if(supabase) await supabase.from('returns').delete().eq('no', n); DB.ret=DB.ret.filter(function(r){return r.no!=n});lists();rHist(); })}
function openDoc(n){var r=DB.ret.filter(function(x){return x.no==n})[0];if(!r)return;editNo=n;
 $('no').value=n;$('loc').value=r.loc=='Remix'?'2':'1';$('date').value=r.date;$('eName').value=r.eName;$('eId').value=r.eId;$('eDept').value=r.dept;$('ePhone').value=r.phone;$('eMail').value=r.mail;$('ePMail').value=r.pmail;$('rem').value=r.rem;
 cur={items:JSON.parse(JSON.stringify(r.items)),chk:r.chk.slice()};setIT(r.it);draw('sE',r.sE);draw('sI',r.sI);rItems();rChk();tags();document.querySelector('[data-t=form]').click()}

function rTable(id,list,cols,key,q){q=q.toLowerCase();var rows=list.filter(function(x){return !q||JSON.stringify(x).toLowerCase().indexOf(q)>=0}).slice(0,200);
 $(id).innerHTML='<tr>'+cols.map(function(c){return '<th>'+c+'</th>'}).join('')+'<th></th></tr>'+rows.map(function(x){return '<tr>'+cols.map(function(c){return '<td>'+esc(x[c])+'</td>'}).join('')+'<td><button class="b d" onclick="delRow(\''+(id=='aT'?'ast':'emp')+'\',\''+esc(x[key])+'\')">ลบ</button></td></tr>'}).join('')+(list.length>200?'<tr><td colspan="9">แสดง 200 รายการแรก (ทั้งหมด '+list.length+')</td></tr>':'')}
function rAst(){rTable('aT',DB.ast,['asset_id','category','brand_Series','serial_no'],'asset_id',$('aq').value)}
function rEmp(){rTable('pT',DB.emp,['EmployeeNo','EmployeeNameTH','GroupCode','GroupNameTH','Mobile','EMail'],'EmployeeNo',$('pq').value)}

async function delRow(t,k){
  var f=t=='ast'?'asset_id':'EmployeeNo'; DB[t]=DB[t].filter(function(x){return String(x[f])!=k});
  await initSupabaseClient();
  if(supabase){ if(t==='ast') await supabase.from('assets').delete().eq('asset_id', k); if(t==='emp') await supabase.from('employees').delete().eq('employee_no', k); }
  lists();t=='ast'?rAst():rEmp()
}

async function addAst(){
  var assetId = $('a1').value.trim(); if(!assetId) return toast('กรุณาใส่ asset_id');
  var exists = DB.ast.some(function(x){ return String(x.asset_id).toLowerCase() === assetId.toLowerCase(); });
  if(exists) return toast('รหัสอุปกรณ์ "' + assetId + '" นี้มีอยู่ในระบบแล้ว ไม่สามารถเพิ่มซ้ำได้');
  var rec = {asset_id: assetId, category: $('a2').value, brand_Series: $('a3').value, serial_no: $('a4').value}; DB.ast.push(rec);
  await initSupabaseClient();
  if(supabase) {
    var res = await supabase.from('assets').insert({asset_id: rec.asset_id, category: rec.category, brand_series: rec.brand_Series, serial_no: rec.serial_no});
    if(res.error) { DB.ast.pop(); return toast('บันทึกไม่สำเร็จ: รหัสอุปกรณ์นี้มีอยู่ในฐานข้อมูลกลางแล้ว'); }
  }
  ['a1','a2','a3','a4'].forEach(function(i){$(i).value=''}); lists(); rAst(); toast('เพิ่มอุปกรณ์สำเร็จ');
}

async function addEmp(){
  if(!$('p1').value.trim())return toast('กรุณาใส่ EmployeeNo');
  var rec = {EmployeeNo:$('p1').value.trim(),EmployeeNameTH:$('p2').value,GroupNameTH:$('p3').value,Mobile:$('p4').value,EMail:$('p5').value,GroupCode:$('p6').value.trim()};
  var i=DB.emp.findIndex(function(x){return String(x.EmployeeNo)==String(rec.EmployeeNo)});if(i>=0)DB.emp[i]=rec;else DB.emp.push(rec);
  await initSupabaseClient();
  if(supabase) await supabase.from('employees').upsert({employee_no: rec.EmployeeNo, employee_name_th: rec.EmployeeNameTH, group_code: rec.GroupCode, group_name_th: rec.GroupNameTH, mobile: rec.Mobile, email: rec.EMail});
  ['p1','p2','p3','p4','p5','p6'].forEach(function(i){$(i).value=''});lists();rEmp()
}

function imp(fid,t){
  var f=$(fid).files[0];if(!f)return toast('กรุณาเลือกไฟล์ก่อน');var r=new FileReader();
  r.onload=async function(e){
    try{
      var wb=XLSX.read(new Uint8Array(e.target.result),{type:'array'}),rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''}),k=t=='ast'?'asset_id':'EmployeeNo',n=0,skipped=0;
      toast('กำลังนำข้อมูลขึ้น Cloud กรุณารอสักครู่...');
      var bulk = [];
      rows.forEach(function(x){
        if(String(x[k]).trim()){
          x[k]=String(x[k]).trim();
          if(t === 'ast') {
            var exists = DB.ast.some(function(y){ return String(y.asset_id).toLowerCase() === String(x[k]).toLowerCase(); });
            if(exists) { skipped++; return; }
          }
          var i=DB[t].findIndex(function(y){return String(y[k])==String(x[k])});
          if(i>=0 && t !== 'ast') DB[t][i]=x; else if(i < 0) DB[t].push(x);
          n++;
          if(t==='ast') bulk.push({asset_id:x.asset_id, category:x.category, brand_series:x.brand_Series, serial_no:x.serial_no});
          if(t==='emp') bulk.push({employee_no:x.EmployeeNo, employee_name_th:x.EmployeeNameTH, group_code:x.GroupCode, group_name_th:x.GroupNameTH, mobile:x.Mobile, email:x.EMail});
        }
      });
      await initSupabaseClient();
      if(bulk.length > 0 && supabase) { var res = await supabase.from(t==='ast'?'assets':'employees').insert(bulk); if(res.error) throw res.error; }
      lists();t=='ast'?rAst():rEmp(); toast('นำเข้าสำเร็จ ' + n + ' รายการ' + (skipped > 0 ? ' (ข้ามรหัสที่ซ้ำไป ' + skipped + ' รายการ)' : ''));
    }catch(err){toast('อ่านไฟล์ไม่สำเร็จ หรือรหัสอุปกรณ์ซ้ำกับในระบบ: ' + err.message)}
  };
  r.readAsArrayBuffer(f)
}

function tpl(t){var d=t=='ast'?[{asset_id:'NB-0001',category:'Notebook',brand_Series:'Dell Latitude 5440',serial_no:'ABC1234'}]:[{EmployeeNo:'E001',EmployeeNameTH:'สมชาย ใจดี',GroupCode:'IT',GroupNameTH:'เทคโนโลยีสารสนเทศ',Mobile:'0812345678',EMail:'somchai@company.com'}]; var wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(d),'Sheet1');XLSX.writeFile(wb,t=='ast'?'Inventory-template.xlsx':'Staff-template.xlsx')}
function flat(){var f=$('rf').value,t=$('rt').value,l=$('rl').value,s=$('rs').value,o=[]; DB.ret.forEach(function(r){if(f&&r.date<f||t&&r.date>t||l&&r.loc!=l)return;r.items.forEach(function(i){if(s&&i.st!=s)return;o.push({เลขที่เอกสาร:r.no,วันที่:thDate(r.date),สถานที่:r.loc,พนักงาน:r.eName,แผนก:r.dept,รายการ:i.type,รหัสอุปกรณ์:i.code,ยี่ห้อรุ่น:i.brand,Serial:i.sn,สภาพ:i.st,ผู้รับIT:r.it,ตรวจสอบแล้ว:r.ver?'ใช่':'ไม่',_d:r.date})})});return o}
function cnt(a,k){var m={};a.forEach(function(x){var v=x[k]||'(ไม่ระบุ)';m[v]=(m[v]||0)+1});return m}
function bars(m){var mx=Math.max.apply(null,Object.values(m).concat(1));return Object.keys(m).sort(function(a,b){return m[b]-m[a]}).map(function(k){return '<div class="row" style="margin:3px 0"><span style="width:130px">'+esc(k)+'</span><div class="bar" style="width:'+(m[k]/mx*50)+'%"></div><b>'+m[k]+'</b></div>'}).join('')||'<p>ไม่มีข้อมูล</p>'}
function rRep(){var a=flat(),docs={};a.forEach(function(x){docs[x.เลขที่เอกสาร]=1});var today=Date.now(),od=[]; DB.ret.forEach(function(r){if(!r.ver){var d=(today-new Date(r.date))/864e5;if(d>=0)od.push({r:r,d:Math.floor(d)})}}); var c=cnt(a,'สภาพ'); $('repOut').innerHTML='<div class="card"><h2>สรุปภาพรวม</h2><div class="kpi"><div>เอกสาร<b>'+Object.keys(docs).length+'</b></div><div>อุปกรณ์ที่ส่งคืน<b>'+a.length+'</b></div><div>ชำรุด<b class="bad">'+(c['ชำรุด']||0)+'</b></div><div>สูญหาย<b class="bad">'+(c['สูญหาย']||0)+'</b></div><div>รอส่งคืน<b class="warn">'+(c['รอส่งคืน']||0)+'</b></div></div></div><div class="card"><h2>แยกตามสภาพ</h2>'+bars(c)+'</div><div class="card"><h2>แยกตามประเภท</h2>'+bars(cnt(a,'รายการ'))+'</div><div class="card"><h2>แยกตามแผนก</h2>'+bars(cnt(a,'แผนก'))+'</div><div class="card"><h2>แยกตามสถานที่</h2>'+bars(cnt(a,'สถานที่'))+'</div><div class="card"><h2>เอกสารที่ยังไม่ตรวจสอบ (กำหนด 30 วัน)</h2><div class="sc"><table><tr><th>เลขที่</th><th>พนักงาน</th><th>ผ่านมา (วัน)</th><th>สถานะ</th></tr>'+od.sort(function(x,y){return y.d-x.d}).map(function(o){return '<tr><td>'+esc(o.r.no)+'</td><td>'+esc(o.r.eName)+'</td><td>'+o.d+'</td><td class="'+(o.d>30?'bad':o.d>=23?'warn':'')+'">'+(o.d>30?'เลยกำหนด':o.d>=23?'ใกล้ครบกำหนด':'อยู่ในกำหนด')+'</td></tr>'}).join('')+'</table></div></div><div class="card"><h2>รายละเอียดอุปกรณ์</h2><div class="sc"><table><tr>'+['เลขที่เอกสาร','วันที่','พนักงาน','รายการ','รหัสอุปกรณ์','Serial','สภาพ'].map(function(h){return '<th>'+h+'</th>'}).join('')+'</tr>'+a.slice(0,300).map(function(x){return '<tr>'+['เลขที่เอกสาร','วันที่','พนักงาน','รายการ','รหัสอุปกรณ์','Serial','สภาพ'].map(function(h){return '<td>'+esc(x[h])+'</td>'}).join('')+'</tr>'}).join('')+'</table></div></div>'}
function expRep(){var a=flat().map(function(x){delete x._d;return x}),wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(a),'Report');XLSX.writeFile(wb,'IT-Return-Report.xlsx')}
function printRep(){rRep();var d=document.createElement('div');d.style.cssText='width:700px;background:#fff;color:#000;--card:#fff;--ink:#000;--mut:#555;--line:#ccc;--acc:#1d4f91;--bad:#b42318;--ok:#18794e;--warn:#b54708;--bg:#fff';d.innerHTML='<style>td,th{white-space:normal!important}</style><h2 style="margin:0 0 8px">รายงานการส่งคืนอุปกรณ์ไอที</h2>'+$('repOut').innerHTML;toPdf(d,'IT-Return-Report.pdf')}

function initApp(){ pad('sE'); pad('sI'); lists(); newDoc(); fetchHistory(); }

['loc','date'].forEach(function(i){$(i).addEventListener('change',refNo)});
$('eName').addEventListener('change',fillEmp);
$('eName').addEventListener('input',fillEmp);
$('it').addEventListener('change',itChange);
