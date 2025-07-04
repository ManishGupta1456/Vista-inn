const fetch = require("node-fetch");

exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed"
    };
  }

  const { name, email, phone, room_type, checkin, checkout } = JSON.parse(event.body);

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
        checkout_date: checkout
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
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err })
    };
  }
};
