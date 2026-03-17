const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');

// API Keys (reemplaza con tus claves si usas otras APIs)
// const WEATHER_API_KEY = 'TU_CLAVE_OPENWEATHERMAP'; // No necesario para wttr.in
const NEWS_API_KEY = '253dd00ea9bb4a0d99f562dcac86128e'; // Obtén en https://newsapi.org/

let warns = {};
if (fs.existsSync('warns.json')) {
    warns = JSON.parse(fs.readFileSync('warns.json'));
}

let lastActivity = {};
if (fs.existsSync('activity.json')) {
    lastActivity = JSON.parse(fs.readFileSync('activity.json'));
}

let commandCooldowns = {}; // Para rate limiting

const localeMap = {
    '1': 'en-US',      // USA / Canadá
    '7': 'ru-RU',      // Rusia
    '20': 'ar-EG',     // Egipto
    '27': 'af-ZA',     // Sudáfrica
    '30': 'el-GR',     // Grecia
    '31': 'nl-NL',     // Países Bajos
    '32': 'fr-BE',     // Bélgica
    '33': 'fr-FR',     // Francia
    '34': 'es-ES',     // España
    '36': 'hu-HU',     // Hungría
    '39': 'it-IT',     // Italia
    '40': 'ro-RO',     // Rumania
    '44': 'en-GB',     // Reino Unido
    '45': 'da-DK',     // Dinamarca
    '46': 'sv-SE',     // Suecia
    '47': 'no-NO',     // Noruega
    '48': 'pl-PL',     // Polonia
    '49': 'de-DE',     // Alemania
    '52': 'es-MX',     // México
    '53': 'es-CU',     // Cuba
    '54': 'es-AR',     // Argentina
    '55': 'pt-BR',     // Brasil
    '56': 'es-CL',     // Chile
    '57': 'es-CO',     // Colombia
    '58': 'es-VE',     // Venezuela
    '60': 'ms-MY',     // Malasia
    '61': 'en-AU',     // Australia
    '62': 'id-ID',     // Indonesia
    '63': 'en-PH',     // Filipinas
    '64': 'en-NZ',     // Nueva Zelanda
    '65': 'en-SG',     // Singapur
    '66': 'th-TH',     // Tailandia
    '81': 'ja-JP',     // Japón
    '82': 'ko-KR',     // Corea del Sur
    '84': 'vi-VN',     // Vietnam
    '86': 'zh-CN',     // China
    '90': 'tr-TR',     // Turquía
    '91': 'en-IN',     // India
    '92': 'ur-PK',     // Pakistán
    '93': 'fa-AF',     // Afganistán
    '94': 'si-LK',     // Sri Lanka
    '95': 'my-MM',     // Myanmar
    '98': 'fa-IR',     // Irán
    '212': 'ar-MA',    // Marruecos
    '213': 'ar-DZ',    // Argelia
    '216': 'ar-TN',    // Túnez
    '218': 'ar-LY',    // Libia
    '220': 'en-GM',    // Gambia
    '221': 'fr-SN',    // Senegal
    '222': 'ar-MR',    // Mauritania
    '223': 'fr-ML',    // Malí
    '224': 'fr-GN',    // Guinea
    '225': 'fr-CI',    // Costa de Marfil
    '226': 'fr-BF',    // Burkina Faso
    '227': 'ha-NE',    // Níger
    '228': 'fr-TG',    // Togo
    '229': 'fr-BJ',    // Benín
    '230': 'fr-MU',    // Mauricio
    '231': 'en-LR',    // Liberia
    '232': 'en-SL',    // Sierra Leona
    '233': 'en-GH',    // Ghana
    '234': 'en-NG',    // Nigeria
    '235': 'ar-TD',    // Chad
    '236': 'fr-CF',    // República Centroafricana
    '237': 'fr-CM',    // Camerún
    '238': 'pt-CV',    // Cabo Verde
    '239': 'pt-ST',    // Santo Tomé y Príncipe
    '240': 'es-GQ',    // Guinea Ecuatorial
    '241': 'fr-GA',    // Gabón
    '242': 'fr-CG',    // República del Congo
    '243': 'fr-CD',    // RDC
    '244': 'pt-AO',    // Angola
    '245': 'pt-GW',    // Guinea-Bissau
    '246': 'en-IQ',    // Territorio cedido (Ejemplo)
    '247': 'en-GD',    // Granada
    '248': 'en-SC',    // Seychelles
    '249': 'ar-SD',    // Sudán
    '250': 'fr-RW',    // Ruanda
    '251': 'am-ET',    // Etiopía
    '252': 'so-SO',    // Somalia
    '253': 'so-DJ',    // Yibuti
    '254': 'sw-KE',    // Kenia
    '255': 'sw-TZ',    // Tanzania
    '256': 'en-UG',    // Uganda
    '257': 'fr-BI',    // Burundi
    '258': 'pt-MZ',    // Mozambique
    '260': 'en-ZM',    // Zambia
    '261': 'mg-MG',    // Madagascar
    '262': 'fr-RE',    // Reunión
    '263': 'en-ZW',    // Zimbabue
    '264': 'en-NA',    // Namibia
    '265': 'en-MW',    // Malawi
    '266': 'st-LS',    // Lesoto
    '267': 'en-BW',    // Botsuana
    '268': 'en-SZ',    // Suazilandia
    '269': 'fr-KM',    // Comoras
    '290': 'en-SH',    // Santa Elena
    '291': 'ti-ER',    // Eritrea
    '297': 'nl-AW',    // Aruba
    '298': 'fo-FO',    // Islas Feroe
    '299': 'kl-GL',    // Groenlandia
};

function getLocaleFromJid(jid) {
    if (!jid) return 'en-US';
    const num = jid.split('@')[0].replace(/[^0-9]/g, '');

    let bestLocale = 'en-US';
    let bestPrefixLen = 0;

    for (const prefix in localeMap) {
        if (num.startsWith(prefix) && prefix.length > bestPrefixLen) {
            bestPrefixLen = prefix.length;
            bestLocale = localeMap[prefix];
        }
    }

    return bestLocale;
}


// Permite usar un binario de Chrome/Chromium personalizado (útil en Termux)
const executablePath = process.env.CHROME_PATH || process.env.CHROMIUM_PATH || '';

const puppeteerConfig = {
    headless: true,
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
    ],
    defaultViewport: null,
    timeout: 60000
};

if (executablePath) {
    puppeteerConfig.executablePath = executablePath;
}

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: '/data/data/com.termux/files/usr/bin/chromium',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-extensions',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process'
        ]
    }
});

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('auth_failure', (msg) => {
    console.error('Auth failure:', msg);
});

client.on('disconnected', (reason) => {
    console.warn('Client disconnected:', reason);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

client.on('group_join', async (notification) => {
    // Nuevos integrantes añadidos al grupo
    const recipients = await notification.getRecipients();
    const mentions = recipients;
    const mentionText = recipients.map(r => `@${r.id.user}`).join(' ');
    const text = `👑 ¡Bienvenid@ a **Only Queens**! ${mentionText}

Aquí celebramos la confianza, el estilo y la energía de cada reina que se une. 💫
Siéntete libre de brillar, compartir y disfrutar de este espacio creado para destacar lo mejor de ti.

`;

    await notification.reply(text, { mentions });
});

client.on('group_leave', async (notification) => {
    // Alguien se fue o fue expulsado
    const recipients = await notification.getRecipients();
    const mentions = recipients;
    const names = recipients.map((r) => r.pushname || r.number || r.id.user).join(', ');

    const authorId = notification.author;
    const isSelfLeave = !authorId || recipients.some(r => r.id._serialized === authorId);

    if (!isSelfLeave && authorId) {
        // Fue expulsado por otro admin
        const actorContact = await notification.getContact();
        const actorMention = actorContact;
        const text = `⚠️ *${names}* fue expulsado/a por @${actorContact.id.user}.`;
        await notification.reply(text, { mentions: [actorMention, ...mentions] });
    } else {
        // Se fue por su propia voluntad
        const text = `😢 *${names}* ha salido del grupo. ¡Te esperamos de vuelta!`;
        await notification.reply(text, { mentions });
    }
});

client.on('message', async (message) => {
    const rawBody = message.body || '';
    const body = rawBody.trim();

    console.log('Mensaje recibido de:', message.from, 'Body:', rawBody, '=>', body);

    const chat = await message.getChat();
    if (!chat || !chat.id || !chat.id._serialized) return;

    const target = chat.id._serialized;

    if (chat.isGroup) {
        lastActivity[message.author] = Date.now();
        fs.writeFileSync('activity.json', JSON.stringify(lastActivity));
    }

    const bratMatch = body.trim().toLowerCase().match(/^\.?brat(\s+(.+))?/);
    if (bratMatch) {
        const text = (bratMatch[2] || 'se pasho').trim();
        console.log(`.brat recibido: texto="${text}" desde ${message.from}`);
        const buffer = await createBratSticker(text);
        const media = new MessageMedia('image/png', buffer.toString('base64'));
        const sent = await client.sendMessage(target, media, { sendMediaAsSticker: true, stickerMetadata: { author: 'Only Queen', pack: 'Brat Pack' } });
        console.log('.brat enviado:', sent.id ? sent.id._serialized : '(sin id)');
        return;
    }

    if (body.startsWith('.')) {
        const parts = body.slice(1).trim().split(/\s+/);
        const command = parts.shift().toLowerCase();
        const args = parts;
        console.log('Comando detectado:', { command, args, target });
        try {
            await handleCommand(message, command, args);
        } catch (err) {
            console.error('Error procesando comando:', command, 'args:', args, err);
            await client.sendMessage(target, '❌ Ocurrió un error ejecutando el comando.');
        }
    }
});

async function createBratSticker(text) {
    return new Promise((resolve, reject) => {
        new Jimp(512, 512, '#ffffff', (err, image) => {
            if (err) return reject(err);
            Jimp.loadFont(Jimp.FONT_SANS_64_BLACK, (err, font) => {
                if (err) return reject(err);
                const wrapped = Jimp.measureText(font, text) > 440 ? text.match(/.{1,16}(\s|$)/g).join('\n') : text;
                image.print(font, 16, 16, {
                    text: wrapped,
                    alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
                    alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
                }, 480, 480);
                image.getBuffer('image/png', (err, buffer) => {
                    if (err) return reject(err);
                    resolve(buffer);
                });
            });
        });
    });
}

async function handleCommand(message, command, args) {
    const chat = await message.getChat();
    const isGroup = chat.isGroup;
    const target = (chat && chat.id && chat.id._serialized) ? chat.id._serialized : message.from;

    const contact = await message.getContact();
    const participant = isGroup ? chat.participants.find(p => p.id._serialized === contact.id._serialized) : null;
    const isAdmin = participant?.isAdmin || participant?.isSuperAdmin;

    console.log('handleCommand:', { command, args, from: message.from, target, isGroup, isAdmin, participant: participant && {id: participant.id._serialized, isAdmin: participant.isAdmin, isSuperAdmin: participant.isSuperAdmin} });

    // Solo administrar comandos desde grupo y solo por admins
    if (!isGroup) {
        await client.sendMessage(target, '❌ Los comandos solo se aceptan desde un grupo.');
        return;
    }

    if (!isAdmin) {
        console.log('No es admin, abortando comando');
        await client.sendMessage(target, '❌ Solo admins pueden usar los comandos.');
        return;
    }

    // Rate limiting: 5 segundos entre comandos por usuario
    const now = Date.now();
    if (commandCooldowns[message.from] && now - commandCooldowns[message.from] < 5000) {
        console.log(`Rate limit para ${message.from}`);
        await client.sendMessage(target, '❌ Espera 5 segundos entre comandos.');
        return;
    }
    commandCooldowns[message.from] = now;

    console.log(`Ejecutando comando: ${command} por ${message.from}`);

    switch (command) {
        case 'menu': {
            const imageUrl = 'https://i.pinimg.com/736x/d6/fc/e1/d6fce118b27037475f20c95e5cc7c53a.jpg';
            const menuText = `*¡Only Queens!* 🌟

💎 *Comandos Exclusivos:*

🔥 **Administración y Seguridad (Más Importantes):**
🔥 .menu - Este menú divino
👑 .todos - Invocar a todas las reinas
✨ .n <msg> - Mensaje real a todas
🚪 .cerrar - Cerrar el palacio
🔓 .abrir - Abrir las puertas
⚡ .kick @ - Expulsar intrusos
👸 .promote @ - Coronar reina
👎 .despromote @ - Destronar
⚠️ .warn @ - Advertir con poder
📊 .warns - Ver todas las advertencias

🎨 **Utilidades y Entretenimiento (Menos Importantes):**
🎨 .s - Crear sticker mágico
➕ .agg <código><número> - Invitar 
📜 .reglas - Leer las leyes sagradas
👻 .ghost - Revelar fantasmas inactivos

`;

            try {
                console.log('Descargando imagen del menú...');
                const response = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 7000 });
                const media = new MessageMedia('image/jpeg', response.data.toString('base64'));
                await client.sendMessage(target, media, {
                    caption: menuText
                });
                console.log('.menu enviado con imagen');
            } catch (error) {
                console.error('Error al enviar imagen del menú (fallback a texto):', error?.message || error);
                await client.sendMessage(target, `✅ *Menú*\n\n${menuText}`);
            }
            break;
        }
        case 'todos':
            if (isGroup) {
                const participants = chat.participants.map(p => p.id._serialized);
                const mentions = participants;
                await client.sendMessage(message.from, '@todos', { mentions: mentions });
            } else {
                await client.sendMessage(message.from, 'Este comando solo funciona en grupos.');
            }
            break;

        case 'n':
            if (isGroup) {
                const participants = chat.participants.map(p => p.id._serialized);
                const mentions = participants;
                const text = args.length > 0 ? args.join(' ') : ' ';
                await client.sendMessage(message.from, text, { mentions: mentions });
            } else {
                await client.sendMessage(message.from, '❌ Este comando solo funciona en grupos.');
            }
            break;

        case 's':
            try {
                let targetMessage = message;
                if (message.hasQuotedMsg) {
                    const quoted = await message.getQuotedMessage();
                    if (quoted) {
                        targetMessage = quoted;
                    }
                }

                if (!targetMessage.hasMedia) {
                    await client.sendMessage(message.from, '❌ Envía una imagen o responde a una imagen con .s para crear un sticker.');
                    break;
                }

                const media = await targetMessage.downloadMedia();
                if (!media) {
                    await client.sendMessage(message.from, '❌ No pude descargar la imagen. Intenta de nuevo.');
                    break;
                }

                await client.sendMessage(message.from, media, {
                    sendMediaAsSticker: true,
                    stickerMetadata: { author: 'Only Queen', pack: 'Stickers' }
                });
            } catch (e) {
                console.error('Error en .s:', e);
                await client.sendMessage(message.from, '❌ Error al crear el sticker. Asegúrate de que sea una imagen válida.');
            }
            break;

        case 'cerrar':
            if (isGroup) {
                const contact = await message.getContact();
                const participant = chat.participants.find(p => p.id._serialized === contact.id._serialized);
                if (participant && participant.isAdmin) {
                    await chat.setMessagesAdminsOnly(true);
                    await client.sendMessage(message.from, 'Grupo cerrado.');
                } else {
                    await client.sendMessage(message.from, 'Solo admins pueden cerrar el grupo.');
                }
            } else {
                await client.sendMessage(message.from, 'Este comando solo funciona en grupos.');
            }
            break;

        case 'abrir':
            if (isGroup) {
                const contact = await message.getContact();
                const participant = chat.participants.find(p => p.id._serialized === contact.id._serialized);
                if (participant && participant.isAdmin) {
                    await chat.setMessagesAdminsOnly(false);
                    await client.sendMessage(message.from, 'Grupo abierto.');
                } else {
                    await client.sendMessage(message.from, 'Solo admins pueden abrir el grupo.');
                }
            } else {
                await client.sendMessage(message.from, 'Este comando solo funciona en grupos.');
            }
            break;

        case 'kick':
            if (isGroup) {
                const mentioned = message.mentionedIds;
                const target = (mentioned && mentioned.length > 0) ? mentioned : (args[0] ? [`${args[0].replace(/[^0-9]/g, '')}@c.us`] : []);
                if (target && target.length > 0) {
                    await chat.removeParticipants(target);
                    await client.sendMessage(message.from, '✅ Usuario expulsado.');
                } else {
                    await client.sendMessage(message.from, '❌ Usa `.kick @usuario` o `.kick 50612345678`.');
                }
            } else {
                await client.sendMessage(message.from, '❌ Este comando solo funciona en grupos.');
            }
            break;

        case 'warn':
            if (isGroup) {
                const mentioned = message.mentionedIds;
                const target = (mentioned && mentioned.length > 0) ? mentioned[0] : (args[0] ? `${args[0].replace(/[^0-9]/g, '')}@c.us` : null);
                if (target) {
                    if (!warns[target]) warns[target] = 0;
                    warns[target]++;
                    fs.writeFileSync('warns.json', JSON.stringify(warns));
                    await client.sendMessage(message.from, `⚠️ Advertencia ${warns[target]}/3 para @${target.split('@')[0]}`, { mentions: [target] });
                    if (warns[target] >= 3) {
                        await chat.removeParticipants([target]);
                        await client.sendMessage(message.from, 'Usuario expulsado por acumular 3 advertencias.');
                        delete warns[target];
                        fs.writeFileSync('warns.json', JSON.stringify(warns));
                    }
                } else {
                    await client.sendMessage(message.from, '❌ Usa `.warn @usuario` o `.warn 50612345678`.');
                }
            } else {
                await client.sendMessage(message.from, '❌ Este comando solo funciona en grupos.');
            }
            break;

        case 'agg':
            if (isGroup) {
                const num = args.join('').replace(/\D/g, '');
                if (num.length >= 8) {
                    const jidUser = `${num}@s.whatsapp.net`;
                    try {
                        await chat.addParticipants([jidUser]);
                        await client.sendMessage(message.from, `👑 ¡Bienvenid@ a **Only Queens**! @${num}

Aquí celebramos la confianza, el estilo y la energía de cada persona que se une. 💫
Siéntete libre de brillar, compartir y disfrutar de este espacio creado para destacar lo mejor de ti.`, { mentions: [jidUser] });
                    } catch (e) {
                        console.error('Error al añadir usuario:', e.message);
                        await client.sendMessage(message.from, '❌ Error: No se pudo añadir al usuario. Verifica que:\n• El bot sea administrador\n• El número sea válido\n• El usuario no esté ya en el grupo');
                    }
                } else {
                    await client.sendMessage(message.from, '⚠️ Formato incorrecto. Usa: *.agg (codigo)(numero)*');
                }
            } else {
                await client.sendMessage(message.from, '❌ Este comando solo funciona en grupos.');
            }
            break;

        case 'promote':
            if (isGroup) {
                const contact = await message.getContact();
                const participant = chat.participants.find(p => p.id._serialized === contact.id._serialized);
                if (participant && participant.isAdmin) {
                    const mentioned = message.mentionedIds;
                    if (mentioned && mentioned.length > 0) {
                        await chat.promoteParticipants(mentioned);
                        await client.sendMessage(message.from, 'Usuario promovido a admin.');
                    } else {
                        await client.sendMessage(message.from, 'Menciona a un usuario para promover.');
                    }
                } else {
                    await client.sendMessage(message.from, 'Solo admins pueden promover.');
                }
            } else {
                message.reply('Este comando solo funciona en grupos.');
            }
            break;

        case 'despromote':
            if (isGroup) {
                const contact = await message.getContact();
                const participant = chat.participants.find(p => p.id._serialized === contact.id._serialized);
                if (participant && participant.isAdmin) {
                    const mentioned = message.mentionedIds;
                    if (mentioned && mentioned.length > 0) {
                        await chat.demoteParticipants(mentioned);
                        await client.sendMessage(message.from, 'Admin quitado al usuario.');
                    } else {
                        await client.sendMessage(message.from, 'Menciona a un usuario para quitar admin.');
                    }
                } else {
                    await client.sendMessage(message.from, 'Solo admins pueden promover.');
                }
            } else {
                await client.sendMessage(message.from, 'Este comando solo funciona en grupos.');
            }
            break;

        case 'reglas':
            if (isGroup) {
                const description = chat.description || 'No hay descripción del grupo.';
                await client.sendMessage(message.from, `📜 *Reglas del grupo:*\n\n${description}`);
            } else {
                await client.sendMessage(message.from, 'Este comando solo funciona en grupos.');
            }
            break;

        case 'warns':
            if (isGroup) {
                const warnsList = Object.entries(warns).map(([userId, count]) => `@${userId.split('@')[0]}: ${count} advertencias`).join('\n');
                if (warnsList) {
                    await client.sendMessage(message.from, `📊 *Advertencias en el grupo:*\n\n${warnsList}`);
                } else {
                    await client.sendMessage(message.from, 'No hay advertencias en el grupo.');
                }
            } else {
                await client.sendMessage(message.from, 'Este comando solo funciona en grupos.');
            }
            break;

        case 'ghost':
            if (isGroup) {
                const now = Date.now();
                const inactiveDays = 3 * 24 * 60 * 60 * 1000; // 3 días
                const inactiveUsers = chat.participants.filter(p => {
                    const last = lastActivity[p.id._serialized];
                    return !last || (now - last) > inactiveDays;
                }).map(p => p.id._serialized);
                if (inactiveUsers.length > 0) {
                    await client.sendMessage(message.from, `👻 Usuarios inactivos (más de 3 días): ${inactiveUsers.map(id => `@${id.split('@')[0]}`).join(' ')}`, { mentions: inactiveUsers });
                } else {
                    await client.sendMessage(message.from, 'Todos los miembros han sido activos recientemente.');
                }
            } else {
                await client.sendMessage(message.from, 'Este comando solo funciona en grupos.');
            }
            break;

        case 'clima':
            try {
                const city = args.join(' ');
                if (!city) {
                    await client.sendMessage(message.from, '❌ Usa .clima <ciudad>');
                    break;
                }
                const url = `https://wttr.in/${encodeURIComponent(city)}?format=%C+%t+%w+%h+%P+%m&lang=es`;
                const response = await axios.get(url);
                const data = response.data.trim();
                if (data.includes('Unknown location')) {
                    await client.sendMessage(message.from, '❌ Ciudad no encontrada.');
                    break;
                }
                // Parsear la respuesta (ej. "México City: ☀️ +25°C NW 10 km/h 60% 1013 hPa")
                const parts = data.split(': ');
                const location = parts[0];
                const info = parts[1].split(' ');
                const weather = `🌤️ *Clima en ${location}*\n\n🌡️ Temperatura: ${info[1]}\n💧 Humedad: ${info[4]}\n🌬️ Viento: ${info[2]} ${info[3]}\n📝 ${info[0]}`;
                await client.sendMessage(message.from, weather);
            } catch (error) {
                console.error('Error en .clima:', error.message);
                await client.sendMessage(message.from, '❌ Error al consultar el clima. Verifica la ciudad.');
            }
            break;

        case 'noticias':
            try {
                const url = `https://newsapi.org/v2/top-headlines?country=mx&apiKey=${NEWS_API_KEY}&pageSize=5`;
                const response = await axios.get(url);
                const articles = response.data.articles;
                let news = '📰 *Últimas noticias (México)*\n\n';
                articles.forEach((article, index) => {
                    news += `${index + 1}. ${article.title}\n${article.url}\n\n`;
                });
                await client.sendMessage(message.from, news);
            } catch (error) {
                console.error('Error en .noticias:', error.message);
                await client.sendMessage(message.from, '❌ Error al obtener noticias. Verifica la API key.');
            }
            break;

        default:
            await client.sendMessage(message.from, '❌ Comando no reconocido. Usa .menu para ver lo disponible.');
    }
}

client.initialize();
