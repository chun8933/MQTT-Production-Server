var { JsonDB } = require('node-json-db')
var { Config } = require('node-json-db/dist/lib/JsonDBConfig')

// Init local json db
var log_db = new JsonDB(new Config("log_db", true, true, '/'))

var log_index = log_db.count("/logs");

var Log = (msg, is_err = false) => {

    log_db.push("/logs[]", {
        "id": (++log_index),
        "msg": msg,
        "type": (is_err ? "ERROR" : "Info"),
        "curr_time": new Date().toLocaleString('zh-hk', { hour12: false })
    }, true)
    console.log(msg)
}

var GetData = () => {

    return log_db.getData("/logs");
}

module.exports = {
    Log, GetData
}