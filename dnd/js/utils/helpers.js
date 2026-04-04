// helpers.js — Utility functions for D&D character creator

/**
 * Generate a UUID v4
 * @returns {string}
 */
function generateId() {
  return crypto.randomUUID();
}

/**
 * Calculate ability modifier from score
 * Formula: floor((score - 10) / 2)
 * @param {number} score - Ability score (1-30)
 * @returns {number}
 */
function calcModifier(score) {
  return Math.floor((score - 10) / 2);
}

/**
 * Calculate proficiency bonus from character level
 * @param {number} level - Character level (1-20)
 * @returns {number}
 */
function calcProficiencyBonus(level) {
  return Math.floor((level - 1) / 4) + 2;
}

/**
 * Format a modifier for display: +2, -1, +0
 * @param {number} mod
 * @returns {string}
 */
function formatModifier(mod) {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

/**
 * Show a toast notification
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 */
function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('toast--visible'));

  setTimeout(() => {
    toast.classList.remove('toast--visible');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
