require('dotenv').config();

const mongoose = require('mongoose');

const { Telegraf } = require('telegraf');
const {
    Stage,
    session,
} = Telegraf;
const TelegrafI18n = require('telegraf-i18n/lib/i18n');
const rateLimit = require('telegraf-ratelimit');

const middlewares = require('./scripts/middlewares');
const messages = require('./scripts/messages');
const timer = require('./scripts/timer');

const {
    sender,
    countdownSender
} = require('./services/sender');

const BOT_TOKEN = process.env.BOT_TOKEN;
const DB_CONN = process.env.DB_CONN;

mongoose.set('strictQuery', false);
mongoose.connect(DB_CONN, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
}).catch(console.log);

const bot = new Telegraf(BOT_TOKEN, { handlerTimeout: 100 });

const { telegram: tg } = bot;

const stage = new Stage([]);

const limitConfig = {
    window: 1000,
    limit: 1,
    onLimitExceeded: (ctx, next) => ctx.telegram.sendChatAction(ctx.from.id, 'typing')
};

const i18n = new TelegrafI18n({
    directory: './locales',
    defaultLanguage: 'uk',
    sessionName: 'session',
    useSession: true,
    templateData: {
        pluralize: TelegrafI18n.pluralize,
        uppercase: (value) => value.toUpperCase()
    }
});

tg.callApi('getUpdates', { offset: -1 })
    .then(updates => updates.length && updates[0].update_id + 1)
    .then(offset => { if (offset) return tg.callApi('getUpdates', { offset }) })
    .then(() => bot.launch())
    .then(() => console.info('The bot is launched'))
    .catch(err => console.error(err));

bot.use(session());
bot.use(i18n.middleware());
bot.use(stage.middleware());
bot.use(rateLimit(limitConfig));

bot.use(middlewares.start);
bot.use(middlewares.commands);
bot.use(middlewares.cb);
bot.use(middlewares.shared);

bot.catch(err => console.error(err));

bot.on('text', async (ctx) => {
    const { user } = ctx.state;
    const { data } = ctx.session;
    const { text } = ctx.message;

    const TIME_REG = /([0-9]{2}):([0-9]{2})/;

    let message = null;

    if (data && text !== '/add') {
        if (data.step <= 2) {
            if (data.step === 1) {
                data.text_start = text;
            } else {
                data.text_end = text;
            }

            data.step++;
        } else if (data.step === 3 && TIME_REG.test(text)) {
            const temp = text.split(':');
            const hours = Number(temp[0]);
            const minutes = Number(temp[1]);

            if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
                const now = new Date();
                const date = new Date();
                date.setHours(hours);
                date.setMinutes(minutes);
                date.setSeconds(0);

                if (date < now) {
                    date.setDate(date.getDate() + 1);
                }

                data.step++;
                data.date = date;
            }
        }

        message = messages.add(user.lang, data.step);
    }

    if (message) {
        sender.enqueue({
            chat_id: user.chat_id,
            message
        });
    }
});

bot.telegram.getMe().then((botInfo) => {
    const now = new Date();
    const botUsername = botInfo.username;

    console.log(now);
    console.log(`Username: @${botUsername}`);
});

(async () => {
    const fs = require('fs');

    if (!fs.existsSync('./config.json')) {
        fs.writeFileSync('./config.json', fs.readFileSync('./config_example.json'));
    }

    await sender.create(bot);
    await countdownSender.create(bot);

    await timer.check();
})()

process.once('SIGINT', async () => {
    await bot.stop();
    await mongoose.disconnect();
});
process.once('SIGTERM', async () => {
    await bot.stop();
    await mongoose.disconnect();
});