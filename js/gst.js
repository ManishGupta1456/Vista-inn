function calculateGST(amount) {
  const cgst = amount * 0.06;
  const sgst = amount * 0.06;
  const totalGst = cgst + sgst;
  const total = amount + totalGst;

  return {
    cgst: parseFloat(cgst.toFixed(2)),
    sgst: parseFloat(sgst.toFixed(2)),
    totalGst: parseFloat(totalGst.toFixed(2)),
    total: parseFloat(total.toFixed(2))
  };
}

