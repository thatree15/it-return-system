// สเต็ป 1: ขอรับรหัส OTP 6 หลักไปที่อีเมล
async function requestOTP() {
  var email = $('loginUser').value.trim();
  if(!email){ 
    $('loginMsg').textContent = 'กรุณากรอกอีเมล'; 
    $('loginMsg').style.color = 'var(--bad)';
    return; 
  }

  await initSupabaseClient();
  if(!supabase){ 
    $('loginMsg').textContent = 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้'; 
    return; 
  }

  $('loginMsg').textContent = 'กำลังส่งรหัส OTP 6 หลักไปที่อีเมล...';
  $('loginMsg').style.color = 'var(--ink)';
  
  // คำสั่งส่งรหัส OTP ไปที่อีเมล
  const { data, error } = await supabase.auth.signInWithOtp({
    email: email,
  });

  if(error){
    $('loginMsg').textContent = 'อีเมลไม่ถูกต้อง หรือไม่มีในระบบ';
    $('loginMsg').style.color = 'var(--bad)';
    console.error('OTP Error:', error.message);
    return;
  }

  // ส่งรหัสสำเร็จ สลับหน้าต่างไปสเต็ป 2
  $('loginMsg').textContent = 'ส่งรหัส 6 หลักไปที่อีเมลแล้ว กรุณาตรวจสอบ';
  $('loginMsg').style.color = 'var(--ok)';
  $('step1').style.display = 'none';
  $('step2').style.display = 'block';
}

// สเต็ป 2: นำรหัส 6 หลักที่ได้จากอีเมลมายืนยันเข้าสู่ระบบ
async function verifyOTP() {
  var email = $('loginUser').value.trim();
  var otp = $('loginOTP').value.trim();
  
  if(!otp || otp.length !== 6){ 
    $('loginMsg').textContent = 'กรุณากรอกรหัสให้ครบ 6 หลัก'; 
    $('loginMsg').style.color = 'var(--bad)';
    return; 
  }

  $('loginMsg').textContent = 'กำลังตรวจสอบรหัส...';
  $('loginMsg').style.color = 'var(--ink)';

  // คำสั่งตรวจสอบรหัส OTP กับ Supabase
  const { data: { session }, error } = await supabase.auth.verifyOtp({
    email: email,
    token: otp,
    type: 'email'
  });

  if(error){
    $('loginMsg').textContent = 'รหัส OTP ไม่ถูกต้องหรือหมดอายุแล้ว';
    $('loginMsg').style.color = 'var(--bad)';
    return;
  }

  // ล็อกอินสำเร็จ
  $('loginOverlay').style.display = 'none';
  sessionStorage.setItem('currentUser', session.user.email);
  initApp();
}

// ปุ่มกดยกเลิกเพื่อกลับไปกรอกอีเมลใหม่
function cancelOTP() {
  $('step1').style.display = 'block';
  $('step2').style.display = 'none';
  $('loginOTP').value = '';
  $('loginMsg').textContent = '';
}

// ฟังก์ชันออกจากระบบ
async function handleLogout(){
  await initSupabaseClient();
  if(supabase) {
    await supabase.auth.signOut();
  }
  sessionStorage.removeItem('currentUser');
  location.reload();
}

// ตรวจสอบสถานะการเข้าสู่ระบบอัตโนมัติ
window.addEventListener('DOMContentLoaded', async function(){
  await initSupabaseClient();
  if(supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if(session){
      $('loginOverlay').style.display = 'none';
      sessionStorage.setItem('currentUser', session.user.email);
      initApp();
    }
  }
});
