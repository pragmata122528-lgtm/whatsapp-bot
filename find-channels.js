/**
 * find-channels.js — Channel JID (ID) Finder
 *
 * This script listens for LIVE messages from channels you follow.
 * Every time a channel posts something, it prints that channel's ID.
 *
 * HOW TO USE:
 *   1. Run:  node find-channels.js
 *   2. Wait — when any of your followed channels posts a message, the ID appears here
 *   3. Copy the IDs you want into SOURCE_CHANNEL_IDS in your .env file
 *   4. Press Ctrl+C to stop when done
 */

require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const seenChannels = new Map(); // id → name, to avoid printing duplicates

const client = new Client({
    authStrategy: new LocalAuth({ clientId: 'channel-forwarder' }),
    puppeteer: {
        headless: true,
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    },
});

client.on('qr', (qr) => {
    console.log('\n📱  Scan this QR code:\n');
    qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => {
    console.log('✅  Authenticated!');
});

client.on('ready', () => {
    console.log('\n🚀  Listening for channel messages...');
    console.log('   Waiting for any of your followed channels to post...');
    console.log('   (Press Ctrl+C to stop)\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('  CHANNEL IDs detected (copy these as SOURCE_CHANNEL_IDS)');
    console.log('═══════════════════════════════════════════════════════\n');
});

// Handler for incoming channel messages
async function handleMessage(msg) {
    if (!msg.from || !msg.from.endsWith('@newsletter')) return;

    const channelId = msg.from;

    if (!seenChannels.has(channelId)) {
        // Try to get channel name from the chat
        let channelName = channelId.split('@')[0];
        try {
            const chat = await client.getChatById(channelId);
            channelName = chat.name || channelName;
        } catch (e) {}

        seenChannels.set(channelId, channelName);

        console.log(`  🔔  NEW CHANNEL DETECTED!`);
        console.log(`  Name : ${channelName}`);
        console.log(`  ID   : ${channelId}`);
        console.log(`  Msg  : "${(msg.body || '[media]').slice(0, 60)}"`);
        console.log('  ─────────────────────────────────────────────────────\n');
    } else {
        // Show message from already-known channel
        console.log(`  📨  Message from: ${seenChannels.get(channelId)}`);
        console.log(`       ID: ${channelId}\n`);
    }
}

client.on('message', handleMessage);
client.on('message_create', (msg) => {
    if (msg.from && msg.from.endsWith('@newsletter')) handleMessage(msg);
});

client.on('disconnected', () => {
    console.log('\n⚠️  Disconnected. Restart to reconnect.');
    process.exit(1);
});

// Print summary before exit
process.on('SIGINT', () => {
    console.log('\n\n════════════════════════════════════════');
    console.log('  SUMMARY — Channels seen this session:');
    console.log('════════════════════════════════════════');
    if (seenChannels.size === 0) {
        console.log('  (No channel messages were received — try waiting longer)');
    } else {
        let ids = [];
        seenChannels.forEach((name, id) => {
            console.log(`  ${name}  →  ${id}`);
            ids.push(id);
        });
        console.log('\n  Copy this into your .env SOURCE_CHANNEL_IDS:');
        console.log(`  ${ids.join(',')}`);
    }
    console.log('════════════════════════════════════════\n');
    process.exit(0);
});

console.log('🔄  Starting WhatsApp client...\n');
client.initialize();
