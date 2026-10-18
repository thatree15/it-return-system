async function handleLogin(){
  var u = $('loginUser').value.trim();
  var p = $('loginPass').value.trim();
  if(!u || !p){ $('loginMsg').textContent = 'กรุณากรอกรหัสพนักงานและเบอร์โทร'; return; }
  
  await initSupabaseClient();
  if(!supabase){ $('loginMsg').textContent = 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้'; return; }

  $('loginMsg').textContent = 'กำลังตรวจสอบข้อมูล...';
  
  var { data, error } = await supabase.from('employees').select('*').eq('employee_no', u).eq('mobile', p);
  
  if(error || !data || data.length === 0){
    $('loginMsg').textContent = 'รหัสพนักงานหรือเบอร์โทรศัพท์ไม่ถูกต้อง';
    return;
  }

  $('loginOverlay').style.display = 'none';
  sessionStorage.setItem('isLoggedIn', 'true');
  sessionStorage.setItem('currentUser', u);
  
  // เรียกฟังก์ชันเริ่มทำงานระบบหลัก (จากไฟล์ app.js)
  initApp();
}

function handleLogout(){
  sessionStorage.removeItem('isLoggedIn');
  sessionStorage.removeItem('currentUser');
  location.reload();
}

// ตรวจสอบสถานะการเข้าสู่ระบบอัตโนมัติเมื่อเปิดหน้าเว็บ
window.addEventListener('DOMContentLoaded', async function(){
  await initSupabaseClient();
  if(sessionStorage.getItem('isLoggedIn') === 'true'){
    $('loginOverlay').style.display = 'none';
    initApp();
  }
});
