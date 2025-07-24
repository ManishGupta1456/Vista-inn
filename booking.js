// booking.js (Updated)

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient('https://qfemvwhbqwdccrgklwod.supabase.co', 'public-anon-key');

const auth = window.firebaseAuth;
const RecaptchaVerifier = window.RecaptchaVerifier;
const signInWithPhoneNumber = window.signInWithPhoneNumber;

let recaptcha;
function renderRecaptcha() {
  if (!recaptcha) {
    recaptcha = new RecaptchaVerifier('recaptcha-container', {
      size: 'invisible',
      callback: (response) => console.log('reCAPTCHA solved')
    }, auth);
    recaptcha.render().catch(console.error);
  }
}

function getFormattedDate(date) {
  return date.toISOString().split('T')[0];
}

function calculateNights(checkin, checkout) {
  const inDate = new Date(checkin);
  const outDate = new Date(checkout);
  return Math.ceil((outDate - inDate) / (1000 * 60 * 60 * 24));
}

document.addEventListener('DOMContentLoaded', async () => {
  const checkin = document.getElementById('checkin');
  const checkout = document.getElementById('checkout');
  const livePrice = document.getElementById('live-price');

  const today = getFormattedDate(new Date());
  checkin.min = today;
  checkout.min = today;

  checkin.addEventListener('change', () => {
    checkout.min = checkin.value;
  });

  async function updatePrice() {
    const ci = checkin.value;
    const co = checkout.value;
    const roomType = document.getElementById('roomtype').value;
    if (!ci || !co || new Date(co) <= new Date(ci)) return;

    const nights = calculateNights(ci, co);
    const { data, error } = await supabase
      .from('room_rates')
      .select('*')
      .eq('room_type', roomType)
      .single();

    if (error || !data) {
      livePrice.textContent = 'Error fetching rate';
      return;
    }

    const total = nights * data.rate;
    livePrice.textContent = `Total Price: ₹${total}`;
  }

  checkin.addEventListener('change', updatePrice);
  checkout.addEventListener('change', updatePrice);
  document.getElementById('roomtype').addEventListener('change', updatePrice);

  document.getElementById('booking-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const ci = document.getElementById('checkin').value;
    const co = document.getElementById('checkout').value;
    const guests = parseInt(document.getElementById('guests').value);
    const roomType = document.getElementById('roomtype').value;

    // Validate date range
    if (new Date(ci) < new Date() || new Date(co) <= new Date(ci)) {
      return alert('❌ Invalid check-in/check-out date.');
    }

    // Check availability
    const { data: bookings } = await supabase
      .from('bookings')
      .select('*')
      .or(`room_type.eq.${roomType},block.eq.true`)
      .gte('checkin', ci)
      .lt('checkout', co);

    const maxRooms = roomType === 'double' ? 3 : 1;
    if (bookings.filter(b => !b.block).length >= maxRooms || bookings.some(b => b.block)) {
      return alert('❌ Room not available for the selected dates.');
    }

    // Trigger OTP
    renderRecaptcha();
    const phoneWithCode = '+91' + phone;
    try {
      const confirmationResult = await signInWithPhoneNumber(auth, phoneWithCode, recaptcha);
      window.confirmationResult = confirmationResult;
      document.getElementById('otp-box').style.display = 'block';
      alert('✅ OTP sent to your phone.');
    } catch (error) {
      console.error(error);
      alert('❌ OTP failed: ' + error.message);
    }
  });

  document.getElementById('submit-otp-btn').addEventListener('click', async () => {
    const code = document.getElementById('otp-input').value;
    if (!code || code.length !== 6) return alert('❌ Enter a valid 6-digit OTP');

    try {
      await window.confirmationResult.confirm(code);

      // OTP verified — now insert booking
      const form = document.getElementById('booking-form');
      const formData = new FormData(form);
      const booking = Object.fromEntries(formData);
      booking.id = 'BKG-' + Math.random().toString(36).substr(2, 9);

      const { error } = await supabase.from('bookings').insert([booking]);
      if (error) throw error;

      alert('✅ Booking confirmed!');
      form.reset();
      document.getElementById('otp-box').style.display = 'none';
      livePrice.textContent = '';
    } catch (err) {
      alert('❌ Invalid OTP: ' + err.message);
    }
  });
});
