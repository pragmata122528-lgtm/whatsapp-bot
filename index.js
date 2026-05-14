/**
 * WhatsApp Channel → Group Forwarder
 * Forwards messages from WhatsApp Channels (Newsletters) to your group.
 *
 * IMPORTANT: Uses whatsapp-web.js (unofficial). Use a spare number.
 */

require('dotenv').config();
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// ── Config ────────────────────────────────────────────────────────────────────

const TARGET_GROUP_ID = process.env.TARGET_GROUP_ID;

// Comma-separated channel IDs (end with @newsletter), or leave empty to forward ALL channels
const SOURCE_CHANNEL_IDS = process.env.SOURCE_CHANNEL_IDS
    ? process.env.SOURCE_CHANNEL_IDS.split(',').map(s => s.trim()).filter(Boolean)
    : [];

// Optional: only forward if message contains these keywords (comma-separated)
const FILTER_KEYWORDS = process.env.FILTER_KEYWORDS
    ? process.env.FILTER_KEYWORDS.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
    : [];

// ── Validate config ───────────────────────────────────────────────────────────

if (!TARGET_GROUP_ID) {
    console.error('❌  TARGET_GROUP_ID is not set in .env — see README.');
    process.exit(1);
}

// ── Bot setup ─────────────────────────────────────────────────────────────────

const client = new Client({
    authStrategy: new LocalAuth({ clientId: 'channel-forwarder' }),
    puppeteer: {
        headless: true,
        executablePath: process.env.CHROME_BIN || undefined,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
        ],
    },
});

// ── Event: QR code ────────────────────────────────────────────────────────────

client.on('qr', (qr) => {
    console.log('\n📱  Scan this QR code with your WhatsApp (use a SPARE number!)\n');
    qrcode.generate(qr, { small: true });
    console.log('\nWaiting for scan...\n');
});

// ── Event: Authenticated ──────────────────────────────────────────────────────

client.on('authenticated', () => {
    console.log('✅  Authenticated — session saved, no need to scan again next time.');
});

// ── Event: Ready ──────────────────────────────────────────────────────────────

client.on('ready', async () => {
    console.log('\n🚀  Bot is ready!\n');
    console.log(`   Target group  : ${TARGET_GROUP_ID}`);
    console.log(`   Watching      : ${SOURCE_CHANNEL_IDS.length > 0 ? SOURCE_CHANNEL_IDS.join(', ') : 'ALL channels'}`);
    console.log(`   Keywords      : ${FILTER_KEYWORDS.length > 0 ? FILTER_KEYWORDS.join(', ') : 'All messages'}`);
    console.log('\n✏️   Tip: Run "node get-ids.js" to find your channel & group IDs.\n');
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function isFromChannel(msg) {
    // WhatsApp Channel IDs always end with @newsletter
    return msg.from && msg.from.endsWith('@newsletter');
}

function passesSourceFilter(msg) {
    if (SOURCE_CHANNEL_IDS.length === 0) return true; // forward from all channels
    return SOURCE_CHANNEL_IDS.includes(msg.from);
}

function passesKeywordFilter(msg) {
    if (FILTER_KEYWORDS.length === 0) return true; // no filter, forward everything
    const text = (msg.body || msg.caption || '').toLowerCase();
    return FILTER_KEYWORDS.some(kw => text.includes(kw));
}

// ── Event: Channel message ────────────────────────────────────────────────────

async function handleChannelMessage(msg) {
    if (!isFromChannel(msg))      return;
    if (!passesSourceFilter(msg)) return;
    if (!passesKeywordFilter(msg)) {
        console.log(`⏭️   Skipped (keyword filter): "${msg.body?.slice(0, 60)}"`);
        return;
    }

    try {
        const chat = await client.getChatById(TARGET_GROUP_ID);

        // ── Has media (image, video, document, etc.) ──────────────────────────
        if (msg.hasMedia) {
            const media = await msg.downloadMedia();
            if (media) {
                // Send media directly — no "Forwarded" label
                await chat.sendMessage(media, {
                    caption: msg.body || msg.caption || '',
                    sendMediaAsDocument: false,
                });
                console.log(`📨  Sent media: "${(msg.body || '[media]').slice(0, 80)}" from ${msg.from}`);
                return;
            }
        }

        // ── Text only ─────────────────────────────────────────────────────────
        if (msg.body) {
            await chat.sendMessage(msg.body);
            console.log(`📨  Sent text: "${msg.body.slice(0, 80)}" from ${msg.from}`);
            return;
        }

        // ── Sticker / other unsupported type ──────────────────────────────────
        console.log(`⏭️   Skipped unsupported message type from ${msg.from}`);

    } catch (err) {
        console.error(`❌  Failed to send message: ${err.message}`);
    }
}

// whatsapp-web.js fires 'message' for incoming msgs (including channel posts)
client.on('message', handleChannelMessage);

// Some versions of whatsapp-web.js use this event for newsletter messages
client.on('message_create', (msg) => {
    if (isFromChannel(msg)) handleChannelMessage(msg);
});

// ── Event: Disconnected ───────────────────────────────────────────────────────

client.on('disconnected', (reason) => {
    console.warn(`⚠️   Disconnected: ${reason}. Restart the bot to reconnect.`);
    process.exit(1);
});

// ── Start ─────────────────────────────────────────────────────────────────────

console.log('🔄  Starting WhatsApp client...');
client.initialize();
