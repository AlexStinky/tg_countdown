const fs = require('fs');

const messages = require('./messages');

const { sender } = require('../services/sender');
const {
    countdownDBService,
    userDBService
} = require('../services/db');

const ADMINS = process.env.ADMINS.split(',');

const LANGUAGES = /uk/;

const start = async (ctx, next) => {
    const { message } = ctx.update.callback_query || ctx.update;

    if (message) {
        try {
            if (message.chat.type === 'private') {
                const username = ctx.chat.username || ctx.from.username || ctx.from.first_name;

                ctx.state.user = await userDBService.get({ chat_id: ctx.from.id });

                if (!ctx.state.user) {
                    const lang = (LANGUAGES.test(ctx.from.language_code)) ?
                        ctx.from.language_code : 'uk';
                    const from = (message.chat.type === 'private' && message.text && message.text.includes('/start ')) ?
                        message.text.replace('/start ', '') : 'organic';
                    const user = {
                        chat_id: ctx.from.id,
                        username,
                        lang,
                        from
                    };

                    ctx.state.user = await userDBService.create(user);

                    await ctx.i18n.locale(lang);
                }

                if (ctx.state.user.username !== username ||
                    ctx.state.user.first_name !== first_name
                ) {
                    ctx.state.user = await userDBService.update({ chat_id: ctx.from.id }, {
                        isActive: true,
                        username,
                        first_name
                    }, 'after');
                }
            }
        } catch (error) {
            //
        }
    }

    return next();
};

const commands = async (ctx, next) => {
    const { message } = ctx.update;

    const { user } = ctx.state;

    if (message && message.text) {
        const now = new Date();

        const { text } = message;

        const match = text.split(' ');

        let chat_id = message.chat.id,
            response_message = null;

        if (message.chat.type === 'private') {
            if (match[0] === ctx.i18n.t('cancel_button')) {
                await ctx.replyWithHTML(ctx.i18n.t('start_message'), {
                    reply_markup: {
                        remove_keyboard: true
                    }
                });
            }

            if (user.isAdmin || ADMINS.includes(user.chat_id)) {
                if (match[0] === '/admin') {
                    const check = await userDBService.get({
                        $or: [
                            { chat_id: match[1] },
                            { username: match[1] }
                        ]
                    });
                
                    if (check) {
                        check.isAdmin = (user.chat_id == check.chat_id) ?
                            true : !check.iAdmin;
    
                        await userDBService.update({ chat_id: check.chat_id }, check);
                
                        response_message = messages.userInfo(user.lang, check);
                    }
                }

                if (match[0] === '/add') {
                    ctx.session.data = {
                        step: 1,
                        text_start: '',
                        text_end: '',
                        date: null
                    };
    
                    response_message = messages.add(user.lang, 1);
                }

                if (match[0] === '/addChat') {
                    response_message = messages.addChat(user.lang);
                }

                if (match[0] === '/stop') {
                    await countdownDBService.updateAll({ isActive: true }, {
                        date: now
                    });

                    await ctx.replyWithHTML(ctx.i18n.t('timersIsStopped_message'));
                }

                if (match[0] === '/deleteAll') {
                    await countdownDBService.deleteAll({});

                    await ctx.replyWithHTML('Done!');
                }
            }
        }

        if (response_message) {
            sender.enqueue({
                chat_id,
                message: response_message
            });
        }
    }

    return next();
};

const cb = async (ctx, next) => {
    const { callback_query } = ctx.update;

    const { user } = ctx.state;

    if (callback_query) {
        const CONFIG = JSON.parse(fs.readFileSync('./config.json'));

        const { message } = callback_query;
        const { message_id } = message;

        const match = callback_query.data.split('=');

        let deleteMessage = false,
            response_message = null,
            update = null;

        if (callback_query.message.chat.type === 'private') {
            if (match[0] === 'cancel') {
                ctx.session.data = null;

                deleteMessage = true;
            }

            if (match[0] === 'send') {
                const data = { ...ctx.session.data };
                const message = messages.countdown('uk', data);

                ctx.session.data = null;

                deleteMessage = true;

                CONFIG['CHATS'].forEach(el => sender.enqueue({
                    action: 'countdown',
                    chat_id: el,
                    message,
                    data
                }));
            }
        }

        if (update) {
            await userDBService.update({ chat_id: ctx.from.id }, update);
        }

        if (deleteMessage) {
            sender.deleteMessage(ctx.from.id, message_id);
        }

        if (response_message) {
            sender.enqueue({
                chat_id: ctx.from.id,
                message: response_message
            });
        }
    }

    return next();
};

const shared = async (ctx, next) => {
    const { update } = ctx;
    const { user } = ctx.state;

    let response_message = null;

    if (update.message) {
        const {
            chat_shared,
            chats_shared
        } = update.message;

        if (chat_shared || chats_shared) {
            const chats = (chat_shared) ? [chat_shared] : chats_shared;

            let temp = null;

            for (let i = 0; i < chats.length; i++) {
                const {
                    chat_id,
                    request_id
                } = chats[i];

                try {
                    temp = await ctx.telegram.getChat(chat_id);

                    if (request_id === 1) {
                        const CONFIG = JSON.parse(fs.readFileSync('./config.json'));

                        let text = ctx.i18n.t('chatIsAdded_message');
                        
                        if (!CONFIG['CHATS'].includes(temp.id)) {
                            CONFIG['CHATS'][CONFIG['CHATS'].length] = temp.id;
                        } else {
                            CONFIG['CHATS'] = CONFIG['CHATS'].filter(el => el !== temp.id);

                            text = ctx.i18n.t('chatIsRemoved_message');
                        }

                        fs.writeFileSync('./config.json', JSON.stringify(CONFIG));

                        await ctx.replyWithHTML(text, {
                            reply_markup: {
                                remove_keyboard: true
                            }
                        });
                    }
                } catch (error) {
                    console.log('[getChat]', error);

                    //response_message = messages.addBotToChats(user.lang, ctx.botInfo);
                }
            }
        }
    }

    if (response_message) {
        sender.enqueue({
            chat_id: ctx.from.id,
            message: response_message
        });
    }

    return next();
};

module.exports = {
    start,
    commands,
    cb,
    shared
}