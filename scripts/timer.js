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

        await countdownSender.sendMessage(
            el.chat_id,
            messages.countdown('uk', el, el.message_id)
        );

        await sleep(1000);
    }

    await countdownDBService.updateAll({
        data: {
            $lt: now
        }
    }, { isActive: false });

    return check();
}

module.exports = {
    check
}