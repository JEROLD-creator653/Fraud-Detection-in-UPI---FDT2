export const formatUPIId = (phoneNumber) => {
  // Remove all non-digit characters and append @upi
  const cleaned = phoneNumber.replace(/\D/g, '');
  return `${cleaned}@upi`;
};

export const validatePhoneNumber = (phoneNumber) => {
  // Indian phone number validation (10 digits with optional country code)
  const phoneRegex = /^(\+91|91|0)?[6-9]\d{9}$/;
  return phoneRegex.test(phoneNumber);
};

export const formatAmount = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(amount);
};

export const getRiskColor = (score) => {
  const riskScore = parseFloat(score) * 100;
  if (riskScore >= 60) return 'red';
  if (riskScore >= 30) return 'yellow';
  return 'green';
};

export const getRiskLabel = (score) => {
  const riskScore = parseFloat(score) * 100;
  if (riskScore >= 60) return 'High Risk';
  if (riskScore >= 30) return 'Medium Risk';
  return 'Low Risk';
};