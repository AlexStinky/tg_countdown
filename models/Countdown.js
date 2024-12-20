const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CountdownSchema = new Schema({
    creator_id: {
        type: String
    },
    chat_id: {
        type: String
    },
    message_id: {
        type: String
    },
    isActive: {
        type: Boolean,
        default: true
    },
    date: {
        type: Date
    },
    text: {
        type: String
    }
}, { versionKey: false });

const Countdown = mongoose.model('Countdown', CountdownSchema);

module.exports = {
    Countdown
}