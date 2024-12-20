const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    chat_id: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    username: {
        type: String,
        required: true
    },
    lang: {
        type: String,
        default: 'pl'
    },
    from: {
        type: String,
        defualt: 'organic'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    start_date: {
        type: Date,
        default: Date.now
    }
}, { versionKey: false });

const User = mongoose.model('User', UserSchema);

module.exports = {
    User
}