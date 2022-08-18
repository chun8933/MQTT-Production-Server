const express = require('express')
const router = express.Router()
var main = require('./../app');
var { GetData } = require('./log');

router.get('/getMessage', (req, res) => {

    res.json({
        code: 200,
        msg: "success",
        result: main.messages
    });
});

router.get('/getLog', (req, res) => {

    res.json({
        code: 200,
        msg: "success",
        result: GetData()
    });
});

module.exports = router