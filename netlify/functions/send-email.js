const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

exports.handler = async (event, context) => {
  console.log("📦 Raw request body:", event.body);

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed"
    };
  }

  const { name, email, phone, room_type, checkin, checkout } = JSON.parse(event.body);

  const params = {
    guest_name: name,
    guest_email: email,
    guest_phone: phone,
    room_type,
    checkin_date: checkin,
    checkout_date: checkout
  };

  console.log("📨 Sending Brevo email with params:", params);

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": process.env.BREVO_API_KEY,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      to: [{ email, name }],
      templateId: 1,
      params: params,
      sender: {
        name: "Vista Inn",
        email: "your_verified@yourdomain.com"
      }
    })
  });

  if (response.ok) {
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Email sent" })
    };
  } else {
    const error = await response.json();
    console.error("❌ Brevo error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error })
    };
  }
};
