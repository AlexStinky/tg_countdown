const messages = require('./messages');

const { countdownSender } = require('../services/sender');
const { countdownDBService } = require('../services/db');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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

        countdownSender.enqueue({
            chat_id: el.chat_id,
            message: messages.countdown('uk', el, el.message_id)
        });
    }

    await countdownDBService.updateAll({
        data: {
            $lt: now
        }
    }, { isActive: false });

    await sleep(1100);

    return check();
}

module.exports = {
    check
}