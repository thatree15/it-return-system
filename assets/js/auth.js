// ตัวแปรสำหรับตั้งเวลา (5 นาที = 300,000 มิลลิวินาที)
let inactivityTimer;
const INACTIVITY_LIMIT = 5 * 60 * 1000; 

// ฟังก์ชันรีเซ็ตเวลาเมื่อมีการขยับเมาส์หรือพิมพ์
function resetInactivityTimer() {
  clearTimeout(inactivityTimer);
  
  // จะจับเวลาเฉพาะตอนที่มีคนล็อกอินอยู่เท่านั้น
  if (sessionStorage.getItem('currentUser')) {
    inactivityTimer = setTimeout(async function() {
      alert('เซสชันของคุณหมดอายุเนื่องจากไม่มีการใช้งานระบบเป็นเวลา 5 นาที กรุณาเข้าสู่ระบบใหม่');
      await handleLogout();
    }, INACTIVITY_LIMIT);
  }
}

// ฟังก์ชันตรวจจับความเคลื่อนไหวของผู้ใช้ (เมาส์, คีย์บอร์ด, ทัชสกรีน, เลื่อนจอ)
function setupActivityListeners() {
  ['mousemove', 'mousedown', 'keypress', 'touchstart', 'scroll'].forEach(function(evt) {
    document.addEventListener(evt, resetInactivityTimer, true);
  });
}

async function handleLogin(){
  var email = $('loginUser').value.trim();
  var p = $('loginPass').value.trim();
  
  if(!email || !p){ $('loginMsg').textContent = 'กรุณากรอกอีเมลและรหัสผ่าน'; return; }
  
  await initSupabaseClient();
  if(!supabase){ $('loginMsg').textContent = 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้'; return; }

  $('loginMsg').textContent = 'กำลังตรวจสอบความปลอดภัยและเข้าสู่ระบบ...';
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: p,
  });
  
  if(error){
    $('loginMsg').textContent = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
    console.error('Login Error:', error.message);
    return;
  }

  $('loginOverlay').style.display = 'none';
  sessionStorage.setItem('currentUser', data.user.email);
  
  resetInactivityTimer(); // เริ่มจับเวลา 5 นาทีทันทีที่ล็อกอินเสร็จ
  initApp();
}

async function handleLogout(){
  clearTimeout(inactivityTimer); // ยกเลิกการจับเวลาเมื่อกดออกระบบ
  
  await initSupabaseClient();
  if(supabase) await supabase.auth.signOut();
  sessionStorage.removeItem('currentUser');
  location.reload();
}

// ทำงานอัตโนมัติเมื่อโหลดหน้าเว็บเสร็จ
window.addEventListener('DOMContentLoaded', async function(){
  setupActivityListeners(); // เปิดระบบดักจับความเคลื่อนไหวเตรียมไว้
  
  await initSupabaseClient();
  if(supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if(session){
      $('loginOverlay').style.display = 'none';
      sessionStorage.setItem('currentUser', session.user.email);
      resetInactivityTimer(); // เริ่มจับเวลาสำหรับคนที่เคยล็อกอินค้างไว้
      initApp();
    }
  }
});
