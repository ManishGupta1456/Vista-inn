import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyC5gC1rUjbvk4L3cmiLHNKLkSuEgkduWys",
  authDomain: "hotel-vista-inn.firebaseapp.com",
  projectId: "hotel-vista-inn",
  storageBucket: "hotel-vista-inn.firebasestorage.app",
  messagingSenderId: "17658781294",
  appId: "1:17658781294:web:88703a4966c049a8bed07f",
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const supabaseClient = window.supabase.createClient(
  "https://fvfhptpkyntqijtpgdse.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2ZmhwdHBreW50cWlqdHBnZHNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNDk4OTAsImV4cCI6MjA2NjkyNTg5MH0.HFVj4oZ_acMOmLiL7ix-G8DahuWzmL9mqDkuvjr8HRA"
);

function generateBookingID(prefix = "A") {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let id = prefix;
  for (let i = 0; i < 5; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

async function generateUniqueBookingID(prefix = "A") {
  for (let attempt = 0; attempt < 5; attempt++) {
    const bookingID = generateBookingID(prefix);
    const { data, error } = await supabaseClient
      .from("bookings")
      .select("id")
      .eq("booking_id", bookingID);
    if (!error && data.length === 0) return bookingID;
  }
  throw new Error("❌ Could not generate a unique booking ID.");
}

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
  const form = document.getElementById("booking-form");
  const room_type = form.roomtype.value;
  const checkin = form.checkin.value;
  const checkout = form.checkout.value;
  const display = document.getElementById("live-price");
  display.textContent = "";
  if (!checkin || !checkout || checkin >= checkout) return;
  const dateRange = getDateRange(checkin, checkout);
  let total = 0;
  for (const date of dateRange) {
    const { data, error } = await supabaseClient
      .from("room_prices")
      .select("price")
      .eq("room_type", room_type)
      .eq("date", date);
    if (data && data.length > 0) total += parseFloat(data[0].price);
    else total += room_type === "double" ? 2000 : 1200;
  }
  display.textContent = `💰 Total Price: ₹${total}`;
}

window.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("booking-form");
  const otpSection = document.getElementById("otp-section");
  const otpInput = document.getElementById("otp-input");
  const submitOtpBtn = document.getElementById("submit-otp-btn");
  const confirmBookingBtn = document.getElementById("confirm-booking-btn");
  const otpStatus = document.getElementById("otp-status");

  document.getElementById("roomtype").addEventListener("change", () => {
    const guestsInput = document.getElementById("guests");
    if (form.roomtype.value === "single") {
      guestsInput.max = 1;
      guestsInput.value = 1;
    } else {
      guestsInput.max = 2;
    }
  });

  form.roomtype.dispatchEvent(new Event("change"));
  form.checkin.addEventListener("change", calculateLivePrice);
  form.checkout.addEventListener("change", calculateLivePrice);
  form.roomtype.addEventListener("change", calculateLivePrice);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    confirmBookingBtn.style.display = "none";
    otpSection.style.display = "block";
    otpStatus.textContent = "Sending OTP...";

    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(
        "recaptcha-container",
        {
          size: "invisible",
          callback: () => {},
        },
        auth
      );
    }
    const appVerifier = window.recaptchaVerifier;

    const fullPhone = form.phone.value.startsWith("+")
      ? form.phone.value
      : "+91" + form.phone.value.replace(/^0+/, "");

    signInWithPhoneNumber(auth, fullPhone, appVerifier)
      .then((confirmationResult) => {
        window.confirmationResult = confirmationResult;
        otpStatus.textContent = "OTP sent. Please enter it.";
      })
      .catch((error) => {
        otpStatus.textContent = "Failed to send OTP. Try again.";
        console.error(error);
      });
  });

  submitOtpBtn.addEventListener("click", async () => {
    const otp = otpInput.value;
    if (!otp || otp.length !== 6) {
      otpStatus.textContent = "Please enter a valid 6-digit OTP.";
      return;
    }
    otpStatus.textContent = "Verifying OTP...";
    window.confirmationResult
      .confirm(otp)
      .then(() => {
        otpStatus.textContent = "OTP verified. Booking confirmed!";
        // Continue booking logic if needed
      })
      .catch((err) => {
        otpStatus.textContent = "Invalid OTP. Try again.";
        console.error(err);
      });
  });
});