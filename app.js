const process = require('process');
process.title = "MQTTServer-Testing";
console.log("PID:" + process.pid + " PNAME:" + process.title);

var express = require('express');
var mqtt = require('mqtt')
var fs = require('fs')
var cron = require('node-cron');
var bodyParser = require('body-parser');

const routers = require('./api/router')
const { Log } = require("./api/log");
const mqttConfig = JSON.parse(fs.readFileSync("./mqttConfig.txt", 'utf8'));
const certificate = fs.readFileSync("./ca.crt", 'utf8');
const pc_name = `client_${Date.now()}_${mqttConfig.pc_name}`
const app = express();

let dataCount = 0;
let checkCount = 0;
let messages = {};
let cleanData = false;
let brokerInfo = {
    clientId: pc_name,
    username: mqttConfig.username,
    password: mqttConfig.password,
    rejectUnauthorized: false,
    ca: certificate
}

app.use('/', express.static('../public'));
app.use('/api/mqtt', routers)
app.use(bodyParser.json())
app.listen(mqttConfig.APIPort, () => {
    console.log(`Express started in ${app.get('env')} mode on http://localhsot: ${mqttConfig.APIPort}`);
    console.log(`{"M_Address":${mqttConfig.address}, "M_PORT":${mqttConfig.port}, "A_PORT":${mqttConfig.APIPort}}`)
    console.log(`{"APIs:["/api/mqtt/getMessage", "/api/mqtt/getLog"]}`)
})

// Connect to broker
let theBroker = mqtt.connect(mqttConfig.address + ":" + mqttConfig.port, brokerInfo);
theBroker.on('connect', function () {

    Log("Connected to the Broker - " + theBroker.connected + " clientID:" + pc_name);
    mqttConfig.topics.forEach(function (element) {
        theBroker.subscribe(element, { qos: 1 }, function (err) {
            Log("Topic : " + element + " is Subscribed");

            if (err) {
                Log(err.message, true)
            }
        })
    });
})

// Data Receiver
theBroker.on('message', function (topic, message, packet) {
    dataCount++
    checkCount++

    if (cleanData) {
        cleanData = false
        messages = {}
    }

    if (messages[topic] == undefined) {
        messages[topic] = [];
    }

    var msgJson = {};
    msgJson.cid = dataCount;
    msgJson.mid = packet.messageId ?? -1;
    msgJson.qos = packet.qos;
    msgJson.retain = packet.retain;
    msgJson.message = JSON.parse(`${message}`);
    msgJson.receivedTime = new Date().toLocaleString('zh-hk', { hour12: false });
    messages[topic].push(msgJson);
})

theBroker.on ('disconnect', (packet) => {
    Log(`MQTT event => 'disconnect', ${packet}`)
})
theBroker.on ('error', (error)=>{
    Log(`MQTT event => 'error', ${error}`)
})
theBroker.on ('close' | 'end' | 'reconnect' | 'offline' | 'outgoingEmpty', () => {
    Log(`MQTT event => 'close' | 'end' | 'reconnect' | 'offline' | 'outgoingEmpty'`)
})

cron.schedule("*/5 * * * * *", function () {
    
    console.log(`Total message received - ${dataCount}`)
})

// Empty MQTT Data Checking
cron.schedule("*/" + mqttConfig.MQTTCheckLive + " * * * *", function () {
    if (checkCount == 0) {

        Log("No MQTT Data", true)
        theBroker.end();
        theBroker.reconnect();
    }
    else {
        Log(`Received ${checkCount} Data in pass ${mqttConfig.MQTTCheckLive} mins`)
    }
    checkCount = 0;
});

// Backup MQTT Data
cron.schedule("*/5 * * * *", function () {

    const json = messages;
    let dataString = JSON.stringify(json, null, 4);
    let file = `mqtt_${Date.now()}.json`
    fs.writeFileSync(`./backup/${file}`, dataString);
    Log(`Backup to ${file}`)
    cleanData = true;
});

exports.messages = messages;
