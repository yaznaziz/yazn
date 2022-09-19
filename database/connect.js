require('dotenv').config()

const mongoose = require('mongoose');

mongoose.connect(process.env.mongoURL).then(() => {
    console.log('[ Database ] Connected to database');
}).catch(err => {
    console.log(err);
});