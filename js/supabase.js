const { createClient } = supabase;
    const supabaseClient = createClient(
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
  await supabase.auth.signOut();
  document.getElementById('login-section').style.display = 'block';
  document.getElementById('invoice-app').style.display = 'none';
}

async function fetchBooking() {
  const bookingId = document.getElementById('booking-id').value;
  const { data, error } = await supabase.from('bookings').select('*').eq('id', bookingId).single();
  if (error || !data) {
    alert("Booking not found. Please enter manually.");
    return;
  }

  document.getElementById('guest-name').value = data.customer_name;
  document.getElementById('guest-state').value = data.state;
  document.getElementById('amount').value = data.total_amount;
}



