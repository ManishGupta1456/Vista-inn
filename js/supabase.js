const supabase = window.supabase;
const supabaseClient = supabase.createClient(
  'https://fvfhptpkyntqijtpgdse.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2ZmhwdHBreW50cWlqdHBnZHNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNDk4OTAsImV4cCI6MjA2NjkyNTg5MH0.HFVj4oZ_acMOmLiL7ix-G8DahuWzmL9mqDkuvjr8HRA'
);

async function login() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    alert("Login failed: " + error.message);
  } else {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('invoice-app').style.display = 'block';
  }
}

async function logout() {
  await supabaseClient.auth.signOut();
  document.getElementById('login-section').style.display = 'block';
  document.getElementById('invoice-app').style.display = 'none';
}

async function fetchBooking() {
  const bookingId = document.getElementById('booking-id').value;
  const { data, error } = await supabaseClient
    .from('bookings')
    .select('*')
    .eq('booking_id', bookingId)
    .single();

  if (error || !data) {
    alert("Booking not found. Please enter manually.");
    return;
  }

  document.getElementById('guest-name').value = data.guest_name || '';
  document.getElementById('guest-email').value = data.guest_email || '';
  document.getElementById('room-type').value = data.room_type || '';
  document.getElementById('checkin-date').value = data.checkin_date || '';
  document.getElementById('checkout-date').value = data.checkout_date || '';
  document.getElementById('amount').value = data.total_amount || '';
}
