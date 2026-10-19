// ตั้งเวลา 5 นาที (300,000 มิลลิวินาที)
let inactivityTimer;
const INACTIVITY_LIMIT = 5 * 60 * 1000; 

function resetInactivityTimer() {
  clearTimeout(inactivityTimer);
  if (sessionStorage.getItem('currentUser')) {
    inactivityTimer = setTimeout(async function() {
      alert('เซสชันของคุณหมดอายุเนื่องจากไม่มีการใช้งานระบบเป็นเวลา 5 นาที กรุณาเข้าสู่ระบบใหม่');
      await handleLogout();
    }, INACTIVITY_LIMIT);
  }
}

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
  resetInactivityTimer();
  initApp();
}

async function handleLogout(){
  clearTimeout(inactivityTimer);
  await initSupabaseClient();
  if(supabase) await supabase.auth.signOut();
  sessionStorage.removeItem('currentUser');
  location.reload();
}

window.addEventListener('DOMContentLoaded', async function(){
  setupActivityListeners();
  await initSupabaseClient();
  if(supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if(session){
      $('loginOverlay').style.display = 'none';
      sessionStorage.setItem('currentUser', session.user.email);
      resetInactivityTimer();
      initApp();
    }
  }
});
