require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const { google }   = require('googleapis');

const app  = express();
const PORT = process.env.PORT || 3000;

/* ---- Gmail OAuth2 client ---- */
const oauth2Client = new google.auth.OAuth2(
    process.env.OAUTH_CLIENT_ID,
    process.env.OAUTH_CLIENT_SECRET,
);
oauth2Client.setCredentials({ refresh_token: process.env.OAUTH_REFRESH_TOKEN });
const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

/* ---- middleware ---- */
app.use(express.json());
app.use(cors({
    origin:  process.env.ALLOWED_ORIGIN || '*',
    methods: ['POST', 'GET'],
}));

/* ---- helpers ---- */
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function buildRawEmail({ from, to, replyTo, subject, html }) {
    const lines = [
        `From: ${from}`,
        `To: ${to}`,
        `Reply-To: ${replyTo}`,
        `Subject: ${subject}`,
        `MIME-Version: 1.0`,
        `Content-Type: text/html; charset=UTF-8`,
        ``,
        html,
    ];
    return Buffer.from(lines.join('\r\n')).toString('base64url');
}

/* ---- routes ---- */
app.get('/health', (_, res) => res.json({ status: 'ok' }));

app.post('/contact', async (req, res) => {
    const { name, email, message } = req.body ?? {};

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Invalid email address.' });
    }

    if (message.trim().length > 4000) {
        return res.status(400).json({ error: 'Message is too long.' });
    }

    try {
        const raw = buildRawEmail({
            from:    `Portfolio Contact <${process.env.GMAIL_USER}>`,
            to:      process.env.TO_EMAIL,
            replyTo: email.trim(),
            subject: `Portfolio message from ${name.trim()}`,
            html: `
                <table style="font-family:sans-serif;font-size:14px;color:#1a1a2e;max-width:560px">
                  <tr><td><strong>Name:</strong></td><td>${escapeHtml(name)}</td></tr>
                  <tr><td><strong>Email:</strong></td><td>${escapeHtml(email)}</td></tr>
                </table>
                <hr style="margin:16px 0">
                <p style="font-family:sans-serif;font-size:14px;white-space:pre-wrap">${escapeHtml(message)}</p>
            `,
        });

        await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
        res.json({ success: true });
    } catch (err) {
        console.error('[gmail error]', err.message);
        res.status(500).json({ error: 'Failed to send. Please try again later.' });
    }
});

/* ---- start ---- */
app.listen(PORT, () => {
    console.log(`Contact backend running on port ${PORT}`);
});
