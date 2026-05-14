/**
 * get-ids.js — Run this ONCE to find your channel & group IDs.
 *
 * Usage:
 *   node get-ids.js
 *
 * Scan the QR code, wait for it to print all your chats, then copy
 * the IDs you need into your .env file.
 */

require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

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

client.on('ready', async () => {
    console.log('\n✅  Connected! Fetching your chats...\n');

    // ── Channels (Newsletters) via internal WhatsApp store ────────────────────
    console.log('═══════════════════════════════════════════');
    console.log('  CHANNELS (copy these as SOURCE_CHANNEL_IDS)');
    console.log('═══════════════════════════════════════════');

    let channels = [];
    try {
        // Try to get channels from WhatsApp's internal Newsletter store
        channels = await client.pupPage.evaluate(() => {
            try {
                const store = window.Store;
                if (store && store.Newsletter) {
                    return store.Newsletter.getModelsArray().map(n => ({
                        name: n.name || n.id.user,
                        id: n.id._serialized,
                    }));
                }
            } catch (e) {}
            return [];
        });
    } catch (e) {}

    // Fallback: check regular chats for newsletter IDs
    if (channels.length === 0) {
        const chats = await client.getChats();
        const newsletterChats = chats.filter(c => c.id && c.id._serialized && c.id._serialized.endsWith('@newsletter'));
        channels = newsletterChats.map(c => ({ name: c.name || c.id.user, id: c.id._serialized }));
    }

    if (channels.length === 0) {
        console.log('  ⚠️  No channels found via API.');
        console.log('  ℹ️  This is a known limitation of whatsapp-web.js.');
        console.log('  ✅  SOLUTION: Leave SOURCE_CHANNEL_IDS empty in .env');
        console.log('      → The bot will auto-forward from ALL channels you follow.\n');
    } else {
        channels.forEach(c => {
            console.log(`  Name : ${c.name}`);
            console.log(`  ID   : ${c.id}`);
            console.log('  ───────────────────────────────────────');
        });
    }

    // ── Groups ────────────────────────────────────────────────────────────────
    const chats = await client.getChats();
    console.log('\n═══════════════════════════════════════════');
    console.log('  GROUPS (copy one as TARGET_GROUP_ID)');
    console.log('═══════════════════════════════════════════');
    const groups = chats.filter(c => c.isGroup);
    if (groups.length === 0) {
        console.log('  (no groups found)');
    } else {
        groups.forEach(c => {
            console.log(`  Name : ${c.name}`);
            console.log(`  ID   : ${c.id._serialized}`);
            console.log('  ───────────────────────────────────────');
        });
    }

    console.log('\n✅  Done! Copy the IDs above into your .env file.');
    console.log('   Then run:  node index.js\n');

    await client.destroy();
    process.exit(0);
});

console.log('🔄  Starting... (scan QR to log in)\n');
client.initialize();
