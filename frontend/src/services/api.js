import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_BASE = Constants.expoConfig?.extra?.API_BASE_URL || 'http://localhost:8000';

// On web, ensure we use the same host the browser can reach
const getBaseUrl = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:8000';
  }
  return API_BASE;
};

async function request(path, options = {}) {
  const url = `${getBaseUrl()}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
}

// Menu
export const fetchMenu = () => request('/api/menu');
export const addMenuItem = (item) => request('/api/menu', { method: 'POST', body: JSON.stringify(item) });
export const updateMenuItem = (id, item) => request(`/api/menu/${id}`, { method: 'PUT', body: JSON.stringify(item) });
export const deleteMenuItem = (id) => request(`/api/menu/${id}`, { method: 'DELETE' });

// AI - Business
export const analyse = (menuItems, context) =>
  request('/api/analyse', {
    method: 'POST',
    body: JSON.stringify({ menu_items: menuItems, context }),
  });

export const simulate = (data) =>
  request('/api/simulate', { method: 'POST', body: JSON.stringify(data) });

// History
export const fetchInsightsHistory = (limit = 10) =>
  request(`/api/insights/history?limit=${limit}`);

// Demo
export const loadDemo = (scenarioId) =>
  request(`/api/demo/${scenarioId}`, { method: 'POST' });

// Chat
export const sendChat = (messages) =>
  request('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ messages }),
  });

// Finance - Income
export const fetchIncome = () => request('/api/finance/income');
export const addIncome = (record) => request('/api/finance/income', { method: 'POST', body: JSON.stringify(record) });
export const deleteIncome = (id) => request(`/api/finance/income/${id}`, { method: 'DELETE' });

// Finance - Expenses
export const fetchExpenses = () => request('/api/finance/expenses');
export const addExpense = (record) => request('/api/finance/expenses', { method: 'POST', body: JSON.stringify(record) });
export const deleteExpense = (id) => request(`/api/finance/expenses/${id}`, { method: 'DELETE' });

// Finance - Debts
export const fetchDebts = () => request('/api/finance/debts');
export const addDebt = (record) => request('/api/finance/debts', { method: 'POST', body: JSON.stringify(record) });
export const updateDebt = (id, record) => request(`/api/finance/debts/${id}`, { method: 'PUT', body: JSON.stringify(record) });
export const deleteDebt = (id) => request(`/api/finance/debts/${id}`, { method: 'DELETE' });

// Finance - Goals
export const fetchGoals = () => request('/api/finance/goals');
export const addGoal = (record) => request('/api/finance/goals', { method: 'POST', body: JSON.stringify(record) });
export const updateGoal = (id, record) => request(`/api/finance/goals/${id}`, { method: 'PUT', body: JSON.stringify(record) });
export const deleteGoal = (id) => request(`/api/finance/goals/${id}`, { method: 'DELETE' });

// Finance - Health Score
export const fetchHealthScore = () => request('/api/finance/health-score');

// AI - Finance
export const financeAdvise = (context) =>
  request('/api/finance/advise', {
    method: 'POST',
    body: JSON.stringify({ context }),
  });

// AI - Bridge (Cross-layer)
export const bridgeAdvise = (context) =>
  request('/api/advise', {
    method: 'POST',
    body: JSON.stringify({ context }),
  });

// Strategies / Advice
export const fetchStrategies = (layer = null) =>
  request(layer ? `/api/strategies?layer=${layer}` : '/api/strategies');
export const fetchStrategy = (id) => request(`/api/strategies/${id}`);
export const addStrategy = (record) => request('/api/strategies', { method: 'POST', body: JSON.stringify(record) });
export const deleteStrategy = (id) => request(`/api/strategies/${id}`, { method: 'DELETE' });

// Helpers
export function calculateMargin(price, cost) {
  if (price <= 0) return 0;
  return ((price - cost) / price) * 100;
}

export function getMarginColor(margin) {
  if (margin <= 0) return '#E53935';
  if (margin < 15) return '#FF8F00';
  return '#4CAF50';
}

export function getProfitabilityScore(items) {
  if (!items.length) return 0;
  const margins = items.map((i) => calculateMargin(i.current_price, i.cost_per_unit));
  const avg = margins.reduce((a, b) => a + b, 0) / margins.length;
  const score = Math.min(100, Math.max(0, Math.round(avg * 2.5)));
  return score;
}

export function getHealthColor(score) {
  if (score >= 70) return '#4CAF50';
  if (score >= 40) return '#FF8F00';
  return '#E53935';
}
