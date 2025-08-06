async function generateInvoice() {
  const name = document.getElementById('customer-name').value;
  const gstin = document.getElementById('customer-gstin').value;
  const state = document.getElementById('customer-state').value;
  const amount = parseFloat(document.getElementById('amount').value);
  const bookingId = document.getElementById('booking-id').value;

  const gst = calculateGST(amount);
  const invoiceNumber = 'INV-' + Date.now();
  const date = new Date().toLocaleDateString();

  // Save to Supabase
  const { error } = await supabase.from('invoices').insert([{
    booking_id: bookingId || null,
    invoice_number: invoiceNumber,
    invoice_date: new Date().toISOString(),
    guest_name: name,
    guest_gstin: gstin || null,
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

  // PDF layout
  const docDefinition = {
    content: [
      { text: 'TAX INVOICE', style: 'header' },
      { text: `Invoice No: ${invoiceNumber}`, margin: [0, 10] },
      { text: `Date: ${date}` },
      { text: `Customer: ${name}` },
      { text: `GSTIN: ${gstin || 'N/A'}` },
      { text: `Place of Supply: Rajasthan` },
      { text: '--------------------------------------', margin: [0, 10] },
      { text: `HSN Code: 9963` },
      { text: `Taxable Value: ₹${amount.toFixed(2)}` },
      { text: `CGST @6%: ₹${gst.cgst.toFixed(2)}` },
      { text: `SGST @6%: ₹${gst.sgst.toFixed(2)}` },
      { text: `Total GST: ₹${gst.totalGst.toFixed(2)}` },
      { text: `Total Invoice Value: ₹${gst.total.toFixed(2)}`, bold: true, margin: [0, 10] },
      { text: 'Thank you for choosing our hotel.', italics: true, margin: [0, 20] }
    ],
    styles: {
      header: { fontSize: 20, bold: true, alignment: 'center' }
    }
  };

  pdfMake.createPdf(docDefinition).download(`${invoiceNumber}.pdf`);
}
