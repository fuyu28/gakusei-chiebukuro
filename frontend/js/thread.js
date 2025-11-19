import { initAuthUI, setupLogoutButton } from './auth-module.js';
// Thread detail page logic will be added here

document.addEventListener('DOMContentLoaded', () => {
  initAuthUI();
  setupLogoutButton();

  // Thread-specific logic to be implemented
  console.log('Thread page loaded');
});
