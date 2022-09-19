const { model , Schema } = require ('mongoose');

const ticketSchema = new Schema ({
    userID: {
        type: String
    },
    channelID: {
        type: String,
    },
    order: {
        type: String,
    },
    role: {
        type: String,
    },
    category: {
        type: String,
    },
    cliamedBy: {
        type: String,
    },
    closed: {
        type: Boolean,
        default: false,
    }
});

module.exports = model ('Ticket', ticketSchema);