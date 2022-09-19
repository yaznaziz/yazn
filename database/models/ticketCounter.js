const { model , Schema } = require ('mongoose');

const ticketCounterSchema = new Schema ({
    type: {
        type: String,
    },
    counter: {
        type: Number,
    },
});

module.exports = model ('TicketCounter', ticketCounterSchema);