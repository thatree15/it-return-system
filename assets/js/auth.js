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
  initApp();
}

async function handleLogout(){
  await initSupabaseClient();
  if(supabase) await supabase.auth.signOut();
  sessionStorage.removeItem('currentUser');
  location.reload();
}

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
