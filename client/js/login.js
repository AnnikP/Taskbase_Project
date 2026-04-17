    let mode = 'login';

    document.getElementById('loginTab').addEventListener('click', () => setMode('login'));
    document.getElementById('registerTab').addEventListener('click', () => setMode('register'));

    function setMode(m) {
      mode = m;
      document.getElementById('loginTab').classList.toggle('active', m === 'login');
      document.getElementById('registerTab').classList.toggle('active', m === 'register');
      document.getElementById('submitBtn').textContent = m === 'login' ? 'Login' : 'Create Account';
      document.querySelectorAll('.register-only').forEach(el => {
        el.style.display = m === 'register' ? 'block' : 'none';
      });
      hideError();
    }

    document.getElementById('submitBtn').addEventListener('click', handleSubmit);
    document.getElementById('passwordInput').addEventListener('keydown', e => {
      if (e.key === 'Enter') handleSubmit();
    });

    async function handleSubmit() {
      hideError();
      const username = document.getElementById('usernameInput').value.trim();
      const password = document.getElementById('passwordInput').value;

      if (!username || !password) { showError('Username and password are required.'); return; }

      try {
        if (mode === 'login') {
          await apiPost('/api/auth/login', { username, password });
        } else {
          const email = document.getElementById('emailInput').value.trim();
          const phone = document.getElementById('phoneInput').value.trim();
          if (!email) { showError('Email is required.'); return; }
          await apiPost('/api/auth/register', { username, email, password, phone });
        }
        window.location.href = '/dashboard';
      } catch (err) {
        showError(err.message);
      }
    }

    async function apiPost(url, body) {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Something went wrong.');
      return data;
    }

    function showError(msg) {
      const el = document.getElementById('errorMsg');
      el.textContent = msg;
      el.classList.add('show');
    }
    function hideError() {
      document.getElementById('errorMsg').classList.remove('show');
    }