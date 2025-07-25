// booking.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyC5gC1rUjbvk4L3cmiLHNKLkSuEgkduWys",
  authDomain: "hotel-vista-inn.firebaseapp.com",
  projectId: "hotel-vista-inn",
  storageBucket: "hotel-vista-inn.appspot.com",
  messagingSenderId: "17658781294",
  appId: "1:17658781294:web:88703a4966c049a8bed07f"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Init Supabase
const supabaseClient = supabase.createClient(
  "https://fvfhptpkyntqijtpgdse.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2ZmhwdHBreW50cWlqdHBnZHNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNDk4OTAsImV4cCI6MjA2NjkyNTg5MH0.HFVj4oZ_acMOmLiL7ix-G8DahuWzmL9mqDkuvjr8HRA"
);

// DOM Elements
const form = document.getElementById("booking-form");
const otpBox = document.getElementById("otp-box");
const otpInput = document.getElementById("otp-input");
const submitOtpBtn = document.getElementById("submit-otp-btn");
const roomTypeSelect = document.getElementById("roomtype");
const guestsInput = document.getElementById("guests");
const checkinInput = document.getElementById("checkin");
const checkoutInput = document.getElementById("checkout");
const livePriceDisplay = document.getElementById("live-price");

let recaptchaVerifier;
let confirmationResult;

function setMinDates() {
  const today = new Date().toISOString().split("T")[0];
  checkinInput.min = today;
  checkoutInput.min = today;
}
setMinDates();

function updateGuestLimits() {
  if (roomTypeSelect.value === "single") {
    guestsInput.max = 1;
    if (guestsInput.value > 1) guestsInput.value = 1;
  } else {
    guestsInput.max = 2;
  }
}
roomTypeSelect.addEventListener("change", () => {
  updateGuestLimits();
  calculateLivePrice();
});
guestsInput.addEventListener("input", updateGuestLimits);

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
  const room_type = roomTypeSelect.value;
  const checkin = checkinInput.value;
  const checkout = checkoutInput.value;
  livePriceDisplay.textContent = "";
  if (!checkin || !checkout || checkin >= checkout) return;

  const dateRange = getDateRange(checkin, checkout);
  let total = 0;
  for (const date of dateRange) {
    const { data } = await supabaseClient
      .from("room_prices")
      .select("price")
      .eq("room_type", room_type)
      .eq("date", date)
      .limit(1);

    total += data?.[0]?.price || (room_type === "double" ? 2000 : 1200);
  }
  livePriceDisplay.textContent = `💰 Total Price: ₹${total}`;
}

checkinInput.addEventListener("change", calculateLivePrice);
checkoutInput.addEventListener("change", calculateLivePrice);

function generateBookingID(prefix = "A") {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return prefix + Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

async function generateUniqueBookingID(prefix = "A") {
  for (let i = 0; i < 5; i++) {
    const id = generateBookingID(prefix);
    const { data } = await supabaseClient.from("bookings").select("id").eq("booking_id", id);
    if (!data?.length) return id;
  }
  throw new Error("Failed to generate unique booking ID");
}

function setupRecaptcha() {
  recaptchaVerifier = new RecaptchaVerifier("recaptcha-container", {
    size: "invisible",
    callback: () => {
      console.log("reCAPTCHA solved");
    },
  }, auth);
}

window.onload = () => {
  setupRecaptcha();
};

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = form.name.value.trim();
  const email = form.email.value.trim();
  const phone = form.phone.value.trim();
  const checkin = checkinInput.value;
  const checkout = checkoutInput.value;
  const guests = parseInt(guestsInput.value);
  const room_type = roomTypeSelect.value;

  // Validate dates
  if (checkin >= checkout) {
    alert("❌ Check-out must be after check-in");
    return;
  }

  // Check availability here (optional)

  // Send OTP
  const phoneWithCountry = "+91" + phone.replace(/^0+/, "");
  try {
    confirmationResult = await signInWithPhoneNumber(auth, phoneWithCountry, recaptchaVerifier);
    alert("OTP sent to your phone.");
    otpBox.style.display = "block";
  } catch (err) {
    console.error(err);
    alert("❌ Failed to send OTP.");
  }
});

submitOtpBtn.addEventListener("click", async () => {
  const code = otpInput.value.trim();
  if (!confirmationResult) return alert("No OTP session. Submit form again.");

  try {
    await confirmationResult.confirm(code);
    const booking_id = await generateUniqueBookingID("A");
    const formData = new FormData(form);

    const { error } = await supabaseClient.from("bookings").insert([
      {
        room_type: formData.get("roomtype"),
        checkin_date: formData.get("checkin"),
        checkout_date: formData.get("checkout"),
        guest_name: formData.get("name"),
        guest_email: formData.get("email"),
        guest_phone: formData.get("phone"),
        booking_id,
      }
    ]);

    if (error) throw error;

    alert("✅ Booking confirmed!");
    window.location.href = `confirmation.html?booking_id=${booking_id}`;
  } catch (err) {
    console.error(err);
    alert("❌ OTP verification failed.");
  }
});
