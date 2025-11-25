/**
 * Format number with thousand separators
 * @param {number} value - Number to format
 * @param {number} decimals - Number of decimal places (default: 0)
 * @returns {string} Formatted number
 */
export const formatNumber = (value, decimals = 0) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }

  return Number(value).toLocaleString('vi-VN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

/**
 * Format currency (VND)
 * @param {number} value - Amount to format
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (value) => {
  return formatNumber(value, 0) + ' đ';
};

/**
 * Format date to Vietnamese format
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatDate = (date) => {
  if (!date) return '';

  const d = new Date(date);
  return d.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Format date to short format (DD/MM/YYYY)
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatDateShort = (date) => {
  if (!date) return '';

  const d = new Date(date);
  return d.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

/**
 * Format month/year (MM/YYYY)
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted month/year string
 */
export const formatMonthYear = (date) => {
  if (!date) return '';

  const d = new Date(date);
  return d.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit'
  });
};

/**
 * Parse currency input string to number
 * Removes all non-digit characters and converts to number
 * @param {string} value - Formatted currency string (e.g., "1,000,000")
 * @returns {number} Parsed number
 */
export const parseCurrencyInput = (value) => {
  if (!value) return 0;
  // Remove all non-digit characters (commas, spaces, etc.)
  const cleaned = String(value).replace(/[^0-9]/g, '');
  return parseFloat(cleaned) || 0;
};

/**
 * Format number for currency input field with comma separators
 * @param {string|number} value - Value to format
 * @returns {string} Formatted string with comma separators
 */
export const formatCurrencyInput = (value) => {
  if (!value && value !== 0) return '';

  // Convert to string and remove all non-digit characters
  const cleaned = String(value).replace(/[^0-9]/g, '');

  if (!cleaned) return '';

  // Convert to number and format with locale
  const number = parseFloat(cleaned) || 0;
  return number.toLocaleString('vi-VN');
};
