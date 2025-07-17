const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const app = express();


app.use(express.json());

// Inicializa o cliente do WhatsApp
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true }
});

// Gera o QR Code para conectar ao WhatsApp
client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('QR Code gerado, escaneie com o WhatsApp.');
});

// Quando o cliente estiver pronto, mostra uma mensagem
client.on('ready', () => {
    console.log('Bot conectado ao WhatsApp!');
    // Inicia o servidor HTTP só depois que o bot estiver pronto
    app.listen(3001, () => {
        console.log('API do bot ouvindo na porta 3001');
    });
});

// Endpoint para enviar mensagem (POST)
app.post('/enviar-codigo', async (req, res) => {
    const { telefone, codigo } = req.body;
    // Formate o telefone no padrão internacional, ex: 55DDXXXXXXXXX@c.us
    const telefoneFormatado = `${telefone.replace(/\D/g, '')}@c.us`

    try {
        await client.sendMessage(telefoneFormatado, `Seu código de verificação é: ${codigo}`);
        return res.json({ ok: true, mensagem: 'Mensagem enviada!' });
    } catch (err) {
        console.error('Erro ao enviar mensagem:', err);
        return res.status(500).json({ ok: false, erro: err.message });
    }
});

// Escuta mensagens recebidas
client.on('message', (message) => {
    console.log(`Mensagem recebida: ${message.body}`);
    if (message.body === 'olá') {
        message.reply('Olá, como posso ajudá-lo?');
    }
});

// Inicia o cliente
client.initialize();
