async function generateInvoice() {
  const hotel = {
    name: "Hotel XYZ",
    address: "1234, Main Road, Jaipur, Rajasthan, 302001",
    gstin: "08ABCDE1234F1Z5"
  };

  const guestName = document.getElementById('guest-name').value;
  const gstin = document.getElementById('guest-gstin').value;
  const guestEmail = document.getElementById('guest-email').value;
  const roomType = document.getElementById('room-type').value;
  const checkinDate = document.getElementById('checkin-date').value;
  const checkoutDate = document.getElementById('checkout-date').value;
  const amount = parseFloat(document.getElementById('amount').value);
  const bookingId = document.getElementById('booking-id').value;

  // Calculate total nights (checkoutDate - checkinDate - 1)
  let totalNights = '';
  if (checkinDate && checkoutDate) {
    const checkin = new Date(checkinDate);
    const checkout = new Date(checkoutDate);
    const diffTime = checkout.getTime() - checkin.getTime();
    totalNights = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) - 1); // as per your rule
  }

  const gst = calculateGST(amount);
  const invoiceNumber = 'INV-' + Date.now();
  const date = new Date().toLocaleDateString();

  // Save to Supabase
  const { error } = await supabaseClient.from('invoices').insert([{
    booking_id: bookingId || null,
    invoice_number: invoiceNumber,
    invoice_date: new Date().toISOString(),
    guest_name: guestName,
    guest_gstin: gstin || null,
    guest_email: guestEmail || null,
    room_type: roomType || null,
    checkin_date: checkinDate || null,
    checkout_date: checkoutDate || null,
    total_night: totalNights,
    supply_state: "Rajasthan",
    taxable_value: amount,
    cgst: gst.cgst,
    sgst: gst.sgst,
    total_gst: gst.totalGst,
    total_invoice_value: gst.total,
    hsn_code: "9963",
    is_b2b: !!gstin
  }]);

  if (error) return alert("Failed to save invoice");

  // PDF layout as per Indian GST Invoice Format
  const docDefinition = {
    content: [
      [
        { text: hotel.name, style: 'hotelName', width: '*' },
        { text: hotel.address, style: 'hotelAddress' },
        { text: `GSTIN: ${hotel.gstin}`, style: 'hotelGSTIN' }
      ],
      { text: 'TAX INVOICE', style: 'header' },
      {
        columns: [
          { text: `Invoice No: ${invoiceNumber}\nDate: ${date}`, width: '50%' },
          { text: `Booking ID: ${bookingId || 'N/A'}`, width: '50%' }
        ],
        margin: [0, 10]
      },
      {
        columns: [
          [
            { text: 'Billed To:', style: 'subHeader' },
            { text: guestName },
            { text: `GSTIN: ${gstin || 'N/A'}` },
            { text: `Email: ${guestEmail || 'N/A'}` }
          ]
        ],
        margin: [0, 10]
      },
      {
        columns: [
          [
            { text: `Room Type: ${roomType || 'N/A'}` },
            { text: `Check-in Date: ${checkinDate || 'N/A'}` },
            { text: `Check-out Date: ${checkoutDate || 'N/A'}` },
            { text: `Total Night(s): ${totalNights}` }
          ]
        ],
        margin: [0, 10]
      },
      { text: '--------------------------------------', margin: [0, 10] },
      {
        table: {
          widths: ['*', 'auto', 'auto', 'auto', 'auto'],
          body: [
            [
              { text: 'Description', style: 'tableHeader' },
              { text: 'HSN/SAC', style: 'tableHeader' },
              { text: 'Amount (₹)', style: 'tableHeader' },
              { text: 'CGST @6%', style: 'tableHeader' },
              { text: 'SGST @6%', style: 'tableHeader' }
            ],
            [
              'Room Tariff',
              '9963',
              amount.toFixed(2),
              gst.cgst.toFixed(2),
              gst.sgst.toFixed(2)
            ]
          ]
        }
      },
      {
        columns: [
          { text: '' },
          [
            { text: `Total GST: ₹${gst.totalGst.toFixed(2)}` },
            { text: `Invoice Total: ₹${gst.total.toFixed(2)}`, bold: true }
          ]
        ],
        margin: [0, 10]
      },
      { text: 'Thank you for choosing our hotel.', italics: true, margin: [0, 20] }
    ],
    styles: {
      header: { fontSize: 20, bold: true, alignment: 'center' },
      hotelName: { fontSize: 18, bold: true },
      hotelAddress: { fontSize: 12 },
      hotelGSTIN: { fontSize: 12, italics: true },
      subHeader: { bold: true, decoration: 'underline', margin: [0, 5, 0, 5] },
      tableHeader: { bold: true, fillColor: '#eeeeee' }
    }
  };

  pdfMake.createPdf(docDefinition).download(`${invoiceNumber}.pdf`);
}
