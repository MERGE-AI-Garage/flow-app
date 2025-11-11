import '../style.css';
import { auth } from '../api.js';

const loginForm = document.getElementById('login-form');
const googleLoginBtn = document.getElementById('google-login');
const errorMessage = document.getElementById('error-message');
const loginButton = document.getElementById('login-button');
const buttonText = document.getElementById('button-text');
const buttonSpinner = document.getElementById('button-spinner');
const togglePasswordBtn = document.getElementById('toggle-password');
const passwordInput = document.getElementById('password');
const eyeIcon = document.getElementById('eye-icon');
const eyeOffIcon = document.getElementById('eye-off-icon');

function showError(message) {
  errorMessage.innerHTML = `
    <svg class="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
    </svg>
    <span>${message}</span>
  `;
  errorMessage.className = 'error-message mb-6';
}

function hideError() {
  errorMessage.classList.add('hidden');
}

function setLoading(isLoading) {
  loginButton.disabled = isLoading;
  const inputs = loginForm.querySelectorAll('input');
  inputs.forEach(input => input.disabled = isLoading);

  if (isLoading) {
    buttonText.classList.add('hidden');
    buttonSpinner.classList.remove('hidden');
  } else {
    buttonText.classList.remove('hidden');
    buttonSpinner.classList.add('hidden');
  }
}

// Password visibility toggle
togglePasswordBtn.addEventListener('click', () => {
  const isPassword = passwordInput.type === 'password';
  passwordInput.type = isPassword ? 'text' : 'password';

  eyeIcon.classList.toggle('hidden');
  eyeOffIcon.classList.toggle('hidden');
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError();
  setLoading(true);

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    const response = await auth.login(email, password);
    const { access_token } = response.data;

    // Store token
    localStorage.setItem('access_token', access_token);

    // Redirect to My Tasks
    window.location.href = '/';
  } catch (error) {
    console.error('Login error:', error);
    setLoading(false);
    showError(
      error.response?.data?.detail || 'Login failed. Please check your credentials.'
    );
  }
});

googleLoginBtn.addEventListener('click', () => {
  auth.googleLogin();
});

// Check if already logged in
if (localStorage.getItem('access_token')) {
  window.location.href = '/';
}
