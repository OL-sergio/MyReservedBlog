/* Login behaviour + lockout (client-side) */

(function () {
  const MAX_ATTEMPTS = 5;
  const LOCKOUT_TIME = 5 * 60 * 1000; // 5 minutos

  function initLogin() {
    const emailInput = document.getElementById('emailInput');
    const passwordInput = document.querySelector('input[name="password"]');
    const passwordError = document.getElementById('passwordError');
    const emailError = document.getElementById('emailError');
    const form = document.querySelector('.login-user');
    const submitButton = form
      ? form.querySelector('button[type="submitLogin"]')
      : null;

    if (
      !emailInput ||
      !passwordInput ||
      !passwordError ||
      !form ||
      !submitButton
    )
      return;

    // Optional email error element (only used if present)
    const hasEmailError = Boolean(emailError);

    let failedAttempts = parseInt(sessionStorage.getItem('loginAttempts')) || 0;
    const lockoutTimestamp = sessionStorage.getItem('loginLockoutTime');

    function setInvalidBorder(input) {
      input.style.borderColor = '#dc3545';
      input.style.borderWidth = '2px';
    }

    function clearInvalidBorder(input) {
      input.style.borderColor = '';
      input.style.borderWidth = '';
    }

    function showEmailInvalid() {
      setInvalidBorder(emailInput);
      if (hasEmailError) {
        emailError.classList.remove('d-none');
        emailError.textContent = '❌ Invalid email.';
      }
    }

    function clearEmailInvalid() {
      clearInvalidBorder(emailInput);
      if (hasEmailError) {
        emailError.classList.add('d-none');
        emailError.textContent = '';
      }
    }

    function updatePasswordErrorDisplay(attempts) {
      if (attempts > 0) {
        setInvalidBorder(passwordInput);
        passwordError.classList.remove('d-none');

        // If currently locked, show remaining time instead of only attempts.
        const lockoutTs = sessionStorage.getItem('loginLockoutTime');
        if (lockoutTs) {
          const now = Date.now();
          const timeElapsed = now - parseInt(lockoutTs);
          if (timeElapsed < LOCKOUT_TIME) {
            const timeRemainingSec = Math.ceil(
              (LOCKOUT_TIME - timeElapsed) / 1000
            );
            const mins = Math.ceil(timeRemainingSec / 60);
            passwordError.textContent = `🔒 Too many attempts. Locked for ${mins} min`;
            return;
          }
        }

        passwordError.textContent = `❌ Invalid credentials. Attempts: ${attempts}/${MAX_ATTEMPTS}`;
      } else {
        clearPasswordError();
      }
    }

    function clearPasswordError() {
      clearInvalidBorder(passwordInput);
      passwordError.classList.add('d-none');
      passwordError.textContent =
        '❌ Password not valid. Please enter a valid password.';
    }

    // Per-request listeners (so we can remove them after login attempt)
    function addInvalidListenersOnce() {
      // If already locked, we don't need listeners.
      if (submitButton.disabled) return;

      // Helper that only clears borders/errors when user provides non-empty values
      function isEmptyNoString(v) {
        return v === undefined || v === null || String(v) === '';
      }

      function emailInputHandler() {
        const emailVal = emailInput.value;

        // If still empty (no string), keep red border.
        if (isEmptyNoString(emailVal)) {
          setInvalidBorder(emailInput);
          return;
        }

        clearEmailInvalid();
        // remove after first valid interaction
        emailInput.removeEventListener('input', emailInputHandler);
        emailInput.removeEventListener('change', emailInputHandler);
      }

      function passwordInputHandler() {
        const passwordVal = passwordInput.value;
        if (isEmptyNoString(passwordVal)) return;
        clearPasswordError();
        passwordInput.removeEventListener('input', passwordInputHandler);
        passwordInput.removeEventListener('change', passwordInputHandler);
      }

      emailInput.addEventListener('input', emailInputHandler);
      emailInput.addEventListener('change', emailInputHandler);
      passwordInput.addEventListener('input', passwordInputHandler);
      passwordInput.addEventListener('change', passwordInputHandler);

      // Return the handlers so caller can remove them if needed
      return {
        emailInputHandler,
        passwordInputHandler,
      };
    }

    function removeInvalidListeners(handlers) {
      if (!handlers) return;
      emailInput.removeEventListener('input', handlers.emailInputHandler);
      emailInput.removeEventListener('change', handlers.emailInputHandler);
      passwordInput.removeEventListener('input', handlers.passwordInputHandler);
      passwordInput.removeEventListener(
        'change',
        handlers.passwordInputHandler
      );
    }

    let invalidHandlers = null;

    function validateForm() {
      const email = emailInput.value.trim();
      const password = passwordInput.value; // NÃO trim: pode conter espaços relevantes

      // Clear previous highlights/errors
      clearEmailInvalid();
      clearPasswordError();

      if (!email || !password) {
        // Mantém comportamento atual (alert) e garante que erros visuais
        // também são coerentes com os campos do formulário.
        if (!email) setInvalidBorder(emailInput);
        if (!password) setInvalidBorder(passwordInput);

        alert('❌ Email and password are required');
        return false;
      }

      // Limpar highlight se estiver tudo ok
      clearEmailInvalid();
      clearPasswordError();
      return true;
    }

    function getFormData() {
      return {
        email: emailInput.value.trim(),
        password: passwordInput.value,
      };
    }

    function lockForm(timeRemaining = 300, isExistingLockout = false) {
      emailInput.disabled = true;
      passwordInput.disabled = true;
      submitButton.disabled = true;
      submitButton.style.opacity = '0.5';
      submitButton.style.cursor = 'not-allowed';

      setInvalidBorder(passwordInput);

      const minutes = Math.ceil(timeRemaining / 60);
      submitButton.textContent = `🔒 Locked (${minutes} min)`;

      passwordError.classList.remove('d-none');
      passwordError.textContent = `🔒 Too many attempts. Locked for ${minutes} min`;

      // Guardar timestamp do bloqueio APENAS se for novo bloqueio (não restauração)
      if (!isExistingLockout) {
        sessionStorage.setItem('loginLockoutTime', Date.now().toString());
        sessionStorage.setItem('loginAttempts', failedAttempts.toString());
      }

      let remaining = timeRemaining;

      // reset timer UI/state if lockForm gets called again
      if (window.__loginLockCountdownTimer) {
        clearInterval(window.__loginLockCountdownTimer);
        window.__loginLockCountdownTimer = null;
      }

      const countdown = setInterval(() => {
        remaining--;
        const mins = Math.ceil(remaining / 60);

        // Keep a clear countdown message (this is the “reset timer” UI)
        submitButton.textContent = `🔒 Locked (${mins} min)`;
        passwordError.textContent = `🔒 Too many attempts. Locked for ${mins} min`;

        if (remaining <= 0) {
          clearInterval(countdown);
          window.__loginLockCountdownTimer = null;
          unlockForm();
        }
      }, 1000);

      window.__loginLockCountdownTimer = countdown;
    }

    function unlockForm() {
      emailInput.disabled = false;
      passwordInput.disabled = false;
      submitButton.disabled = false;
      submitButton.textContent = 'Sign in';
      submitButton.style.opacity = '1';
      submitButton.style.cursor = 'pointer';
      failedAttempts = 0;

      // Remove invalid listeners if any
      removeInvalidListeners(invalidHandlers);
      invalidHandlers = null;

      clearEmailInvalid();
      clearPasswordError();

      sessionStorage.removeItem('loginAttempts');
      sessionStorage.removeItem('loginLockoutTime');

      console.log('✅ Form unlocked');
    }

    function incrementAttempts() {
      failedAttempts++;
      sessionStorage.setItem('loginAttempts', failedAttempts.toString());
      return failedAttempts;
    }

    function resetAttempts() {
      failedAttempts = 0;
      sessionStorage.removeItem('loginAttempts');
      sessionStorage.removeItem('loginLockoutTime');
      clearPasswordError();
      clearEmailInvalid();

      removeInvalidListeners(invalidHandlers);
      invalidHandlers = null;
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (submitButton.disabled) {
        alert('❌ Form is locked. Please wait before trying again.');
        return;
      }

      if (!validateForm()) return;

      // Ensure we start clean (no stale listeners)
      removeInvalidListeners(invalidHandlers);
      invalidHandlers = null;

      const formData = getFormData();

      try {
        const response = await fetch('/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        const data = await response.json();

        if (!response.ok) {
          const attempts = incrementAttempts();
          console.error('❌ Login error:', data.message);
          console.log(`Attempt ${attempts}/${MAX_ATTEMPTS}`);

          // Flag both fields as invalid (server returns generic message)
          showEmailInvalid();
          setInvalidBorder(passwordInput);

          // Add temporary listeners: when user edits again, clear highlights.
          invalidHandlers = addInvalidListenersOnce();

          if (attempts >= MAX_ATTEMPTS) {
            lockForm();
            // No need to keep listeners while locked
            removeInvalidListeners(invalidHandlers);
            invalidHandlers = null;
          } else {
            updatePasswordErrorDisplay(attempts);
          }
        } else {
          // Successful login: clean up listeners + highlight
          resetAttempts();
          sessionStorage.removeItem('loginAttempts');
          sessionStorage.removeItem('loginLockoutTime');
          sessionStorage.setItem('userLoginSuccess', 'true');

          // Remove invalid highlight and listeners
          removeInvalidListeners(invalidHandlers);
          invalidHandlers = null;
          clearEmailInvalid();
          clearPasswordError();

          window.location.href = '/';
        }
      } catch (error) {
        const attempts = incrementAttempts();
        console.error('❌ Error sending form:', error);
        console.log(`Attempt ${attempts}/${MAX_ATTEMPTS}`);

        showEmailInvalid();
        setInvalidBorder(passwordInput);
        invalidHandlers = addInvalidListenersOnce();

        if (attempts >= MAX_ATTEMPTS) {
          lockForm();
          removeInvalidListeners(invalidHandlers);
          invalidHandlers = null;
        } else {
          updatePasswordErrorDisplay(attempts);
        }
      }
    });

    function checkExistingLockout() {
      if (!lockoutTimestamp) {
        if (failedAttempts > 0) updatePasswordErrorDisplay(failedAttempts);
        return;
      }

      const now = Date.now();
      const timeElapsed = now - parseInt(lockoutTimestamp);

      if (timeElapsed < LOCKOUT_TIME) {
        const timeRemaining = Math.ceil((LOCKOUT_TIME - timeElapsed) / 1000);
        lockForm(timeRemaining, true);
      } else {
        unlockForm();
      }
    }

    checkExistingLockout();
  }

  document.addEventListener('DOMContentLoaded', initLogin);
})();
