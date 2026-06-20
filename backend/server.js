require('dotenv').config();
const express    = require('express');
const nodemailer = require('nodemailer');
const cors       = require('cors');

const app  = express();
const PORT = process.env.PORT || 3000;

/* ---- middleware ---- */
app.use(express.json());
app.use(cors({
    origin: process.env.ALLOWED_ORIGIN || '*',
    methods: ['POST', 'GET'],
}));

/* ---- mailer ---- */
const transporter = nodemailer.createTransport({
    host:   'smtp.gmail.com',
    port:   465,
    secure: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

/* ---- helpers ---- */
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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
        await transporter.sendMail({
            from:     `"Portfolio Contact" <${process.env.SMTP_USER}>`,
            to:       process.env.TO_EMAIL,
            replyTo:  email.trim(),
            subject:  `Portfolio message from ${name.trim()}`,
            text:     `Name: ${name.trim()}\nEmail: ${email.trim()}\n\nMessage:\n${message.trim()}`,
            html: `
                <table style="font-family:sans-serif;font-size:14px;color:#1a1a2e;max-width:560px">
                  <tr><td><strong>Name:</strong></td><td>${escapeHtml(name)}</td></tr>
                  <tr><td><strong>Email:</strong></td><td>${escapeHtml(email)}</td></tr>
                </table>
                <hr style="margin:16px 0">
                <p style="font-family:sans-serif;font-size:14px;white-space:pre-wrap">${escapeHtml(message)}</p>
            `,
        });

        res.json({ success: true });
    } catch (err) {
        console.error('[mailer error]', err.message);
        res.status(500).json({ error: 'Failed to send. Please try again later.' });
    }
});

/* ---- start ---- */
app.listen(PORT, () => {
    console.log(`Contact backend running on port ${PORT}`);
});
