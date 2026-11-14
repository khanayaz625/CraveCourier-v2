/**
 * Currency and pricing formatting utilities for Crave
 * Default currency: Indian Rupee (₹ / INR)
 */

export const CURRENCY_SYMBOL = '₹';

/**
 * Format any numerical price in Indian Rupee format
 * @param {number|string} amount
 * @param {boolean} showDecimals
 * @returns {string}
 */
export const formatPrice = (amount, showDecimals = true) => {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '₹0';
  }
  const num = Number(amount);
  if (!showDecimals || num % 1 === 0) {
    return `₹${Math.round(num)}`;
  }
  return `₹${num.toFixed(2)}`;
};

export default {
  CURRENCY_SYMBOL,
  formatPrice,
};
