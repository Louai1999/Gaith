/**
 * Himma API client — replaces window.storage and client-side auth.
 * Loads before app.js; sets window.authToken and apiFetch().
 */
(function () {
  const TOKEN_KEY = 'himma_token';
  const USERNAME_KEY = 'himma_last_username';

  window.authToken = localStorage.getItem(TOKEN_KEY) || '';

  function setToken(token) {
    window.authToken = token || '';
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }

  window.apiFetch = async function apiFetch(path, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };
    if (window.authToken) headers.Authorization = `Bearer ${window.authToken}`;

    const res = await fetch(path, { ...options, headers });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const err = new Error(data.message || 'Request failed');
      err.status = res.status;
      throw err;
    }
    return data;
  };

  window.himmaAuth = {
    async register(username, displayName, password) {
      const data = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, displayName, password }),
      });
      setToken(data.token);
      localStorage.setItem(USERNAME_KEY, data.user.username);
      return data.user;
    },
    async login(username, password) {
      const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      setToken(data.token);
      localStorage.setItem(USERNAME_KEY, data.user.username);
      return data.user;
    },
    logout() {
      setToken('');
    },
    getLastUsername() {
      return localStorage.getItem(USERNAME_KEY) || '';
    },
  };

  window.himmaData = {
    async getProfile() {
      const data = await apiFetch('/api/profile');
      return data.profile;
    },
    async saveProfile(body) {
      const data = await apiFetch('/api/profile', {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      return data.profile;
    },
    async getFoodLog(date) {
      const data = await apiFetch(`/api/food-logs/${date}`);
      return data.entries || [];
    },
    async addFoodLog(entry) {
      const data = await apiFetch('/api/food-logs', {
        method: 'POST',
        body: JSON.stringify(entry),
      });
      return data.entry;
    },
    async deleteFoodLog(id) {
      await apiFetch(`/api/food-logs/${id}`, { method: 'DELETE' });
    },
    async getWaterLog(date) {
      const data = await apiFetch(`/api/water-logs/${date}`);
      return data.entries || [];
    },
    async addWaterLog(entry) {
      const data = await apiFetch('/api/water-logs', {
        method: 'POST',
        body: JSON.stringify(entry),
      });
      return data.entry;
    },
    async deleteWaterLog(id) {
      await apiFetch(`/api/water-logs/${id}`, { method: 'DELETE' });
    },
    async getWeights() {
      const data = await apiFetch('/api/weights');
      return data.weights || [];
    },
    async saveWeight(date, weight) {
      await apiFetch('/api/weights', {
        method: 'POST',
        body: JSON.stringify({ date, weight }),
      });
    },
    async getCustomFoods() {
      const data = await apiFetch('/api/custom-foods');
      return data.foods || [];
    },
    async addCustomFood(food) {
      await apiFetch('/api/custom-foods', {
        method: 'POST',
        body: JSON.stringify({
          name: food.n,
          calories: food.c,
          protein: food.p,
          carbs: food.cb,
          fat: food.f,
        }),
      });
    },
    async getCoachHistory() {
      const data = await apiFetch('/api/coach');
      return data.messages || [];
    },
    async getWaterReminderSettings() {
      const data = await apiFetch('/api/settings/water-reminder');
      return data.settings;
    },
    async saveWaterReminderSettings(settings) {
      const data = await apiFetch('/api/settings/water-reminder', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      return data.settings;
    },
    async getHistoryDays() {
      const data = await apiFetch('/api/history/days');
      return data.days || [];
    },
    async estimateMeal(description) {
      const data = await apiFetch('/api/ai/estimate-meal', {
        method: 'POST',
        body: JSON.stringify({ description }),
      });
      return data.data;
    },
    async sendCoachMessage(message, contextLines) {
      const data = await apiFetch('/api/ai/coach', {
        method: 'POST',
        body: JSON.stringify({ message, contextLines }),
      });
      return data.reply;
    },
  };
})();
