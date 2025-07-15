const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const SUPABASE_URL = "https://fvfhptpkyntqijtpgdse.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

function getDateRange(start, end) {
  const dates = [];
  const curr = new Date(start);
  const last = new Date(end);
  last.setDate(last.getDate() - 1); // exclude checkout

  while (curr <= last) {
    dates.push(curr.toISOString().split("T")[0]);
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
}

exports.handler = async (event, context) => {
  console.log("📨 Received email request:", event.body);  // ✅ This is now INSIDE handler

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed"
    };
  }

  const { name, email, phone, room_type, checkin, checkout, booking_id } = JSON.parse(event.body);
const dates = getDateRange(checkin, checkout);
let total_price = 0;

for (const date of dates) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/room_prices?room_type=eq.${room_type}&date=eq.${date}&select=price`,
    { headers }
  );
  const data = await res.json();

  if (Array.isArray(data) && data.length > 0) {
    total_price += parseFloat(data[0].price);
  } else {
    total_price += room_type === "double" ? 2000 : 1200; // fallback
  }
}

  const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": process.env.BREVO_API_KEY,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      to: [{ email, name }],
      templateId: 1,
      params: {
        guest_name: name,
        guest_email: email,
        guest_phone: phone,
        room_type,
        checkin_date: checkin,
        checkout_date: checkout,
        booking_id,
        total_price
      },
      sender: {
        name: "Vista Inn",
        email: "vista.ranthambore@gmail.com"
      }
    })
  });

  if (brevoResponse.ok) {
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Email sent" })
    };
  } else {
    const err = await brevoResponse.json();
    console.error("❌ Brevo API error:", err);  // ✅ Still inside handler
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err })
    };
  }
};
