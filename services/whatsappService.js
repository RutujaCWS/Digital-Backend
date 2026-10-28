
const { Client, RemoteAuth } = require('whatsapp-web.js');
const { MongoStore } = require('wwebjs-mongo');
const mongoose = require('mongoose');
const qrcode = require('qrcode');
const puppeteer = require('puppeteer');
const fs = require('fs');

let client = null;
let currentQR = null;
let connectionStatus = 'disconnected';
let connectedNumber = null;
let isStarting = false;
let reconnectTimer = null;
let manualLogout = false;
let store = null;

class CustomRemoteAuth extends RemoteAuth {
  async storeRemoteSession(options) {
    try {
      return await super.storeRemoteSession(options);
    } catch (err) {
      console.error(
        'RemoteAuth session backup failed:',
        err.code || '',
        err.message
      );
      throw err;
    }
  }
}

function getStore() {
  if (!store) {
    store = new MongoStore({
      mongoose,
      bucketName: 'whatsapp-session'
    });
  }
  return store;
}

function clearReconnectTimer() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function scheduleReconnect() {
  if (reconnectTimer || manualLogout) return;

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;

    if (client || isStarting || manualLogout) return;

    startWhatsApp().catch(err => {
      console.error('WhatsApp reconnect failed:', err.message);
    });
  }, 15000);
}

async function startWhatsApp() {
  if (isStarting) return;
  if (client && connectionStatus === 'connected') return;

  if (mongoose.connection.readyState !== 1) {
    console.log('WhatsApp start deferred: MongoDB not connected yet');
    connectionStatus = 'disconnected';
    scheduleReconnect();
    return;
  }

  clearReconnectTimer();
  manualLogout = false;
  isStarting = true;
  connectionStatus = 'initializing';

  const chromePath = puppeteer.executablePath();

  console.log('Puppeteer Chrome path:', chromePath);
  console.log('Chrome executable exists:', fs.existsSync(chromePath));

  const waClient = new Client({
    authStrategy: new CustomRemoteAuth({
      store: getStore(),
      clientId: 'admin-whatsapp',
      backupSyncIntervalMs: 86400000
    }),

    puppeteer: {
      headless: true,
      executablePath: chromePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled'
      ]
    }
  });

  client = waClient;

  waClient.on('qr', async qr => {
    try {
      currentQR = await qrcode.toDataURL(qr);
      connectionStatus = 'qr_ready';
      console.log('WhatsApp QR ready. Scan using Linked Devices.');
    } catch (err) {
      console.error('QR generation failed:', err.message);
    }
  });

  waClient.on('authenticated', () => {
    console.log('WhatsApp authenticated successfully');
  });

  waClient.on('ready', () => {
    if (client !== waClient) return;

    connectionStatus = 'connected';
    currentQR = null;
    connectedNumber = waClient.info?.wid?.user || null;
    isStarting = false;

    console.log('WhatsApp connected:', connectedNumber);
  });

  waClient.on('remote_session_saved', () => {
    console.log('WhatsApp session saved to MongoDB');
  });

  waClient.on('auth_failure', msg => {
    if (client !== waClient) return;

    console.error('WhatsApp authentication failed:', msg);

    connectionStatus = 'disconnected';
    currentQR = null;
    connectedNumber = null;
    isStarting = false;
    client = null;

    waClient.destroy().catch(() => {});
    if (!manualLogout) scheduleReconnect();
  });

  waClient.on('change_state', state => {
    console.log('WhatsApp state:', state);
  });

  waClient.on('disconnected', reason => {
    if (client !== waClient) return;

    console.error('WhatsApp disconnected. Reason:', reason);

    client = null;
    currentQR = null;
    connectedNumber = null;
    connectionStatus = 'disconnected';
    isStarting = false;

    if (String(reason).toUpperCase() === 'LOGOUT') {
      console.error('WhatsApp logged out. A new QR scan may be required.');
      return;
    }

    if (!manualLogout) scheduleReconnect();
  });

  try {
    await waClient.initialize();
  } catch (err) {
    console.error('WhatsApp initialize failed:', err.message);

    if (client === waClient) {
      client = null;
      connectionStatus = 'disconnected';
      currentQR = null;
      connectedNumber = null;
    }

    isStarting = false;

    try {
      await waClient.destroy();
    } catch (_) {}

    if (!manualLogout) scheduleReconnect();
  } finally {
    if (client !== waClient && isStarting) {
      isStarting = false;
    }
  }
}

async function sendWhatsAppMessage(phone, message) {
  if (!client || connectionStatus !== 'connected') {
    console.log('WhatsApp message blocked: not connected');
    return false;
  }

  try {
    let clean = String(phone).replace(/\D/g, '');

    if (clean.length === 10) {
      clean = '91' + clean;
    }

    const chatId = `${clean}@c.us`;

    await client.sendMessage(chatId, message);
    console.log('WhatsApp message sent:', chatId);

    return true;
  } catch (err) {
    console.error('WhatsApp send failed:', err.message);
    return false;
  }
}

function getStatus() {
  return {
    status: connectionStatus,
    qr: currentQR,
    connectedNumber
  };
}

async function logout() {
  manualLogout = true;
  clearReconnectTimer();

  const oldClient = client;

  client = null;
  currentQR = null;
  connectedNumber = null;
  connectionStatus = 'disconnected';
  isStarting = false;

  if (oldClient) {
    try {
      await oldClient.logout();
    } catch (err) {
      console.error('WhatsApp logout:', err.message);
    }

    try {
      await oldClient.destroy();
    } catch (_) {}
  }
}

module.exports = {
  startWhatsApp,
  sendWhatsAppMessage,
  getStatus,
  logout
};
