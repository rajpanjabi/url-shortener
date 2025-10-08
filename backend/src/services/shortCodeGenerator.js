// File responsible for generating, validating and converting short codes for URLs

import {customAlphabet} from 'nanoid';

// Base62 alphabet (0-9, a-z, A-Z)
const alphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Create a nanoid generator with the specified alphabet and length
const nanoid = customAlphabet(alphabet, 7); // 7 characters long

/**
 * Generate a unique short code.
 * 62^7 = 3.5 trillion possible combinations.
 */
export const generateShortCode = () => nanoid();

export const isValidShortCode = (code) => {
  const regex = new RegExp(`^[${alphabet}]{6,10}$`);
  return regex.test(code);
};