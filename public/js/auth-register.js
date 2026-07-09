/*
  register.js
  Encapsula a lógica do formulário de registo para melhorar legibilidade/manutenção.
*/

(function () {
  'use strict';

  const $ = (sel) => document.querySelector(sel);

  const el = {
    form: $('.register-user'),

    usernameInput: $('#usernameInput'),
    usernameError: $('#usernameError'),

    emailInput: $('#emailInput'),
    emailError: $('#emailError'),

    passwordInput: $('#floatingPassword'),
    passwordError: $('#passwordError'),

    confirmPasswordInput: $('#floatingConfirmPassword'),
    confirmPasswordError: $('#confirmPasswordError'),

    // (Futuro) container para mensagens: mantém retrocompatível se não existir.
    alertContainer: $('.register-alert-container'),
  };

  // Null-safety: se algum elemento essencial não existir, não executa.
  // (Evita erros em páginas diferentes/reutilizações.)
  const required = [
    el.form,
    el.usernameInput,
    el.usernameError,
    el.emailInput,
    el.emailError,
    el.passwordInput,
    el.passwordError,
    el.confirmPasswordInput,
    el.confirmPasswordError,
  ];

  if (!required.every(Boolean)) return;

  // NOTE: Segurança/Privacidade:
  // O código antigo faz fetch('/users') para validação realtime.
  // Isso pode vazar dados e permitir enumeração.
  // Mantemos o comportamento para compatibilidade, mas recomenda-se
  // substituir por endpoint de validação por campo (ex: /users/check).

  let usersCache = null;

  async function getUsers() {
    if (usersCache) return usersCache;

    try {
      const response = await fetch('/users');
      usersCache = await response.json();
      return usersCache;
    } catch (error) {
      console.error('Erro ao carregar utilizadores:', error);
      usersCache = [];
      return usersCache;
    }
  }

  function clearFieldStyling(input, errorEl) {
    input.style.borderColor = '';
    input.style.borderWidth = '';
    errorEl.classList.add('d-none');
  }

  function setAvailabilityUI(input, errorEl, isTaken) {
    if (isTaken) {
      input.style.borderColor = '#dc3545';
      input.style.borderWidth = '2px';
      errorEl.classList.remove('d-none');
    } else {
      input.style.borderColor = '#198754';
      input.style.borderWidth = '2px';
      errorEl.classList.add('d-none');
    }
  }

  function isValueTaken(users, value, compareKey) {
    const normalized = String(value).toLowerCase();
    return users.some((user) => {
      const candidate = user?.[compareKey];
      return (
        typeof candidate === 'string' &&
        String(candidate).toLowerCase() === normalized
      );
    });
  }

  async function checkAvailability(inputEl, errorEl, compareKey) {
    const value = inputEl.value.trim();
    if (!value) {
      clearFieldStyling(inputEl, errorEl);
      return false;
    }

    const users = await getUsers();
    const isTaken = isValueTaken(users, value, compareKey);
    setAvailabilityUI(inputEl, errorEl, isTaken);
    return isTaken;
  }

  function checkPasswordsMatch() {
    const password = el.passwordInput.value;
    const confirmPassword = el.confirmPasswordInput.value;

    // Se uma das caixas estiver vazia, limpar feedback do match.
    if (!password || !confirmPassword) {
      if (!password) {
        el.passwordInput.style.borderColor = '';
        el.passwordInput.style.borderWidth = '';
      }
      if (!confirmPassword) {
        el.confirmPasswordInput.style.borderColor = '';
        el.confirmPasswordInput.style.borderWidth = '';
      }
      el.confirmPasswordError.classList.add('d-none');
      return;
    }

    if (password === confirmPassword) {
      el.passwordInput.style.borderColor = '#198754';
      el.passwordInput.style.borderWidth = '2px';
      el.confirmPasswordInput.style.borderColor = '#198754';
      el.confirmPasswordInput.style.borderWidth = '2px';
      el.confirmPasswordError.classList.add('d-none');
    } else {
      el.passwordInput.style.borderColor = '#dc3545';
      el.passwordInput.style.borderWidth = '2px';
      el.confirmPasswordInput.style.borderColor = '#dc3545';
      el.confirmPasswordInput.style.borderWidth = '2px';
      el.confirmPasswordError.classList.remove('d-none');
      el.confirmPasswordError.textContent = '❌ As passwords não correspondem';
    }
  }

  el.passwordInput.addEventListener('input', checkPasswordsMatch);
  el.confirmPasswordInput.addEventListener('input', checkPasswordsMatch);

  el.form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = {
      username: el.usernameInput.value,
      email: el.emailInput.value,
      password: el.passwordInput.value,
      confirmPassword: el.confirmPasswordInput.value,
    };

    // Validações obrigatórias
    if (!formData.username.trim()) {
      el.usernameInput.style.borderColor = '#dc3545';
      el.usernameInput.style.borderWidth = '2px';
      el.usernameError.textContent = 'O username é obrigatório';
      el.usernameError.classList.remove('d-none');
      return;
    }

    if (!formData.email.trim()) {
      el.emailInput.style.borderColor = '#dc3545';
      el.emailInput.style.borderWidth = '2px';
      el.emailError.textContent = 'O email é obrigatório';
      el.emailError.classList.remove('d-none');
      return;
    }

    if (!formData.password.trim()) {
      el.passwordInput.style.borderColor = '#dc3545';
      el.passwordInput.style.borderWidth = '2px';
      el.passwordError.textContent = '❌ A password é obrigatória';
      el.passwordError.classList.remove('d-none');
      return;
    }

    if (!formData.confirmPassword.trim()) {
      el.confirmPasswordInput.style.borderColor = '#dc3545';
      el.confirmPasswordInput.style.borderWidth = '2px';
      el.confirmPasswordError.textContent =
        '❌ A confirmação da password é obrigatória';
      el.confirmPasswordError.classList.remove('d-none');
      return;
    }

    // Match passwords
    if (formData.password !== formData.confirmPassword) {
      el.passwordInput.style.borderColor = '#dc3545';
      el.passwordInput.style.borderWidth = '2px';
      el.confirmPasswordInput.style.borderColor = '#dc3545';
      el.confirmPasswordInput.style.borderWidth = '2px';
      el.confirmPasswordError.textContent = '❌ As passwords não correspondem';
      el.confirmPasswordError.classList.remove('d-none');
      return;
    }

    // Visual OK para passwords
    el.passwordInput.style.borderColor = '#198754';
    el.passwordInput.style.borderWidth = '2px';
    el.confirmPasswordInput.style.borderColor = '#198754';
    el.confirmPasswordInput.style.borderWidth = '2px';
    el.confirmPasswordError.classList.add('d-none');

    // Validação final duplicados (compatível com o comportamento antigo)
    const usernameTaken = await checkAvailability(
      el.usernameInput,
      el.usernameError,
      'username'
    );

    const emailTaken = await checkAvailability(
      el.emailInput,
      el.emailError,
      'email'
    );

    if (usernameTaken) return;
    if (emailTaken) return;

    try {
      const response = await fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const msg = String(data?.message || '').toLowerCase();

        const usernameDuplicate =
          msg.includes('username') &&
          (msg.includes('exist') ||
            msg.includes('regist') ||
            msg.includes('já'));

        const emailDuplicate =
          msg.includes('email') &&
          (msg.includes('exist') ||
            msg.includes('regist') ||
            msg.includes('já'));

        if (usernameDuplicate) {
          el.usernameInput.style.borderColor = '#dc3545';
          el.usernameInput.style.borderWidth = '2px';
          el.usernameError.textContent =
            '❌ Username já registado ou não existe na base de dados';
          el.usernameError.classList.remove('d-none');
        }

        if (emailDuplicate) {
          el.emailInput.style.borderColor = '#dc3545';
          el.emailInput.style.borderWidth = '2px';
          el.emailError.textContent =
            '❌ Email já registado ou não existe na base de dados!';
          el.emailError.classList.remove('d-none');
        }

        if (!usernameDuplicate && !emailDuplicate) {
          alert('❌ Erro: ' + (data?.message || 'Erro ao registar'));
        }
        return;
      }

      // Sucesso
      sessionStorage.setItem('userCreatedSuccess', 'true');
      window.location.href = '/';
    } catch (error) {
      console.error('Erro ao enviar formulário:', error);
      alert('❌ Erro na comunicação com o servidor');
    }
  });
})();