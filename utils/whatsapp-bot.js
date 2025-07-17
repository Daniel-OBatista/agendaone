// whatsapp-bot.js

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

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
