const messages = require('./messages');

const { countdownSender } = require('../services/sender');
const { countdownDBService } = require('../services/db');

const check = async () => {
    const now = new Date();

    const data = await countdownDBService.getAll({
        isActive: true,
        date: {
            $gt: now
        }
    });

    for (let i = 0; i < data.length; i++) {
        const el = data[i];

        const diff = Math.floor((el.date - now) / 1000 / 60);
        const req = (diff <= 6) ?
            {
                action: 'countdown',
                chat_id: el.chat_id,
                message: messages.countdown('uk', el, el.message_id),
                data: {
                    _id: el._id
                }
            } :
            {
                action: 'countdown',
                chat_id: el.chat_id,
                message_id: el.message_id,
                message: messages.countdown('uk', el),
                data: {
                    _id: el._id
                }
            };

        countdownSender.enqueue(req);
    }

    await countdownDBService.updateAll({
        data: {
            $lt: now
        }
    }, { isActive: false });

    setTimeout(check, 30 * 1000);
}

module.exports = {
    check
}