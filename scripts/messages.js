const moment = require('moment');

const TelegrafI18n = require('telegraf-i18n/lib/i18n');

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

const PAGINATIONS_SIZE = 5;

const DATE_OPTIONS = {
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric'
};

const paginations = (lang, inline_keyboard, data, page, key, size = PAGINATIONS_SIZE) => {
    const length = data.length;

    if (length > 0) {
        if (page > 1 && (page * size) < length) {
            inline_keyboard[inline_keyboard.length] = [
                { text: i18n.t(lang, 'back_button'), callback_data: `next-${key}-${page - 1}` },
                { text: i18n.t(lang, 'next_button'), callback_data: `next-${key}-${page + 1}` }
            ];
        } else if (page === 1 && length > size) {
            inline_keyboard[inline_keyboard.length] = [
                { text: i18n.t(lang, 'next_button'), callback_data: `next-${key}-${page + 1}` }
            ];
        } else if (page > 1) {
            inline_keyboard[inline_keyboard.length] = [
                { text: i18n.t(lang, 'back_button'), callback_data: `next-${key}-${page - 1}` }
            ];
        }
    }

    return inline_keyboard;
};

const add = (lang, step) => {
    const message = {
        type: 'text',
        text: '',
        extra: {}
    };
    let inline_keyboard = [];

    if (step === 1) {
        message.text = i18n.t(lang, 'enterText_message');
    } else if (step === 2) {
        message.text = i18n.t(lang, 'enterTime_message');
    } else {
        message.text = i18n.t(lang, 'send_message');

        inline_keyboard[inline_keyboard.length] = [{
            text: i18n.t(lang, 'send_button'),
            callback_data: 'send'
        }];
    }

    inline_keyboard[inline_keyboard.length] = [{
        text: i18n.t(lang, 'cancel_button'),
        callback_data: 'cancel'
    }];

    message.extra = {
        reply_markup: {
            inline_keyboard
        }
    };

    return message;
};

const countdown = (lang, data, message_id = null) => {
    const now = moment();

    const difference = moment(data.date).diff(now);

    const duration = moment.duration(difference);
    const days = duration.days();
    let hours = duration.hours();
        hours = (hours < 10) ? `0${hours}` : hours;
    let minutes = duration.minutes();
        minutes = (minutes < 10) ? `0${minutes}` : minutes;
    let seconds = duration.seconds();
        seconds = (seconds < 10) ? `0${seconds}` : seconds;

    const message = {
        type: (message_id) ? 'edit_text' : 'text',
        message_id,
        text: i18n.t(lang, 'countdown_message', {
            text: data.text,
            hours,
            minutes,
            seconds
        }),
        extra: {}
    };

    return message;
};

const userInfo = (lang, user, message_id = null) => {
    const message = {
        type: (message_id) ? 'edit_text' : 'text',
        message_id,
        text: i18n.t(lang, 'userInfo_message', {
            user: i18n.t(lang, 'user_url', {
                id: user.chat_id,
                username: user.username
            }),
            isAdmin: (user.isAdmin) ? '✅' : '❌'
        }),
        extra: {}
    };

    return message;
};

module.exports = {
    add,
    countdown,
    userInfo
}