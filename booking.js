// booking.js - Full Booking Logic

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabase = createClient(
  'https://fvfhptpkyntqijtpgdse.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2ZmhwdHBreW50cWlqdHBnZHNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNDk4OTAsImV4cCI6MjA2NjkyNTg5MH0.HFVj4oZ_acMOmLiL7ix-G8DahuWzmL9mqDkuvjr8HRA'
);

const form = document.getElementById('booking-form');
const otpBox = document.getElementById('otp-box');
const otpInput = document.getElementById('otp-input');
const submitOtpBtn = document.getElementById('submit-otp-btn');
const livePrice = document.getElementById('live-price');

window.addEventListener('DOMContentLoaded', () => {
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("checkin").min = today;
  document.getElementById("checkout").min = today;

  const roomType = document.getElementById("roomtype");
  const guests = document.getElementById("guests");

  roomType.addEventListener('change', () => {
    if (roomType.value === 'single') {
      guests.max = 1;
      guests.value = 1;
    } else {
      guests.max = 2;
    }
  });

  roomType.dispatchEvent(new Event('change'));

  document.getElementById('checkin').addEventListener("change", calculateLivePrice);
  document.getElementById('checkout').addEventListener("change", calculateLivePrice);
  document.getElementById('roomtype').addEventListener("change", calculateLivePrice);
});

function getDateRange(start, end) {
  const dates = [];
  let current = new Date(start);
  const last = new Date(end);
  last.setDate(last.getDate() - 1);
  while (current <= last) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

async function calculateLivePrice() {
  const checkin = form.checkin.value;
  const checkout = form.checkout.value;
  const roomType = form.roomtype.value;

  livePrice.textContent = "";
  if (!checkin || !checkout || checkin >= checkout) return;

  const dateRange = getDateRange(checkin, checkout);
  let total = 0;

  for (const date of dateRange) {
    const { data, error } = await supabase
      .from("room_prices")
      .select("price")
      .eq("room_type", roomType)
      .eq("date", date);

    if (!error && data.length > 0) {
      total += parseFloat(data[0].price);
    } else {
      total += roomType === "double" ? 2000 : 1200;
    }
  }

  livePrice.textContent = `💰 Total Price: ₹${total}`;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const { name, email, phone, checkin, checkout, guests, roomtype } = form;
  const guestCount = parseInt(guests.value);
  const today = new Date().toISOString().split("T")[0];

  if (checkin.value < today) return alert("❌ Check-in date cannot be in the past.");
  if (checkin.value >= checkout.value) return alert("❌ Check-out must be after check-in.");

  if ((roomtype.value === 'single' && guestCount > 1) || (roomtype.value === 'double' && guestCount > 2)) {
    return alert(`❌ Guest limit exceeded for ${roomtype.value} room.`);
  }

  const maxRooms = roomtype.value === 'double' ? 3 : 1;
  const dates = getDateRange(checkin.value, checkout.value);

  for (const date of dates) {
    const { data: bookings = [] } = await supabase
      .from("bookings")
      .select("checkin_date, checkout_date")
      .eq("room_type", roomtype.value);

    const { data: blocks = [] } = await supabase
      .from("blocked_dates")
      .select("start_date, end_date")
      .eq("room_type", roomtype.value);

    const booked = bookings.filter(b => new Date(date) >= new Date(b.checkin_date) && new Date(date) < new Date(b.checkout_date));
    const blocked = blocks.filter(b => new Date(date) >= new Date(b.start_date) && new Date(date) <= new Date(b.end_date));

    if ((booked.length + blocked.length) >= maxRooms) {
      return alert(`❌ No rooms available on ${date}.`);
    }
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpBox.style.display = 'block';
  window.generatedOTP = otp;

  const phoneFull = '+91' + phone.value.replace(/^0+/, '');
  if (!window.recaptchaVerifier) {
    window.recaptchaVerifier = new RecaptchaVerifier('submit-otp-btn', {
      size: 'invisible',
      callback: () => {}
    }, window.firebaseAuth);
  }

  signInWithPhoneNumber(window.firebaseAuth, phoneFull, window.recaptchaVerifier)
    .then(result => {
      window.confirmationResult = result;
      console.log('📲 OTP sent via SMS');
    })
    .catch(err => {
      console.error('❌ Firebase OTP failed', err);
      alert('Failed to send OTP via SMS.');
    });

  fetch("https://vistainn.netlify.app/.netlify/functions/send-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: name.value,
      email: email.value,
      phone: phone.value,
      otp
    })
  })
  .then(res => {
    if (!res.ok) throw new Error("Email send failed");
    console.log("📧 Email OTP sent");
  })
  .catch(err => console.error("❌ Email error:", err));
});

submitOtpBtn.addEventListener('click', async () => {
  const entered = otpInput.value.trim();
  if (entered.length !== 6) return alert("❌ Enter a 6-digit OTP.");

  try {
    await window.confirmationResult.confirm(entered);
    if (entered !== window.generatedOTP) return alert("❌ OTP mismatch.");

    const booking_id = await generateUniqueBookingID("A");
    const { error } = await supabase.from('bookings').insert([{
      booking_id,
      room_type: form.roomtype.value,
      checkin_date: form.checkin.value,
      checkout_date: form.checkout.value,
      guest_name: form.name.value,
      guest_email: form.email.value,
      guest_phone: form.phone.value
    }]);

    if (error) throw error;

    await fetch("https://vistainn.netlify.app/.netlify/functions/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name.value,
        email: form.email.value,
        phone: form.phone.value,
        room_type: form.roomtype.value,
        checkin: form.checkin.value,
        checkout: form.checkout.value,
        booking_id
      })
    });

    window.location.href = `confirmation.html?booking_id=${booking_id}`;
  } catch (err) {
    alert("❌ OTP verification failed.");
    console.error(err);
  }
});

async function generateUniqueBookingID(prefix = "A") {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let i = 0; i < 5; i++) {
    const id = prefix + Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const { data } = await supabase.from('bookings').select('id').eq('booking_id', id);
    if (!data || data.length === 0) return id;
  }
  throw new Error("Could not generate unique booking ID");
}
