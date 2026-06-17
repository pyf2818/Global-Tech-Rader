// Toast notification utility extracted from App.jsx

export function showToast(message, duration = 2000) {
  const toast = document.createElement('div');
  toast.className = 'material-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
}
