let express = require('express');
let path = require('path');
let cookieParser = require('cookie-parser');
let logger = require('morgan');
let mysql = require('mysql2');
let cors = require('cors');
let createError = require('http-errors');
let bodyParser = require('body-parser');
const { Web3 } = require('web3');
const { ethers } = require('ethers');
const swaggerUI = require('swagger-ui-express');
//controllere
let indexRouter = require('./src/routes/index');
let testRouter = require('./src/routes/test-contract-route');
let chainRouter = require('./src/routes/chain-route');

let app = express();
app.use(cors());
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');  //jade era inainte
app.disable('etag');
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

let baseURL = '/blockchain-api';

app.use(baseURL+'/', indexRouter);
// app.use(baseURL+'/chain', chainRouter);
app.use(baseURL+'/test', testRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    console.log(err);
    err.path = req.path;
    err.timestamp = Date.now();
    res.status(err.status);
    res.send(err);
});
//posibil si port
let host = 'localhost';
let user = 'root';
let password = 'root';
let database = 'licenta-dsrl';

let db_config = {
    host: host,
    user: user,
    password: password,
    database: database
};

let db;

// connect to database
function handleDisconnect() {
    db = mysql.createConnection(db_config); // Recreate the connection, since
    // the old one cannot be reused.

    console.log('Connecting... ');
    db.connect(function (err) {              // The server is either down
        if (err) {                                     // or restarting (takes a while sometimes).
            console.log('error when connecting to db:', err);
            setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
        }                                     // to avoid a hot loop, and to allow our node script to
    });                                     // process asynchronous requests in the meantime.

    // If you're also serving http, display a 503 error.
    db.on('error', function (err) {
        console.log('db error', err);
        if (err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
            console.log('Connection lost, reconnecting... ');
            handleDisconnect();
            global.db = db; // lost due to either server restart, or a
        } else {                                      // connection idle timeout (the wait_timeout
            console.log('Unhandled error... ');
            throw err;                                  // server letiable configures this)
        }
    });
}

handleDisconnect();
global.db = db;

let ip = 'http://localhost:8545';  //blockchain

global.provider = new ethers.JsonRpcProvider(ip);
global.ethers = ethers;
global.createError = createError;

async function checkEthersConnection() {
    try {
        const provider = new ethers.JsonRpcProvider(ip);
        const network = await provider.getNetwork();
        console.log(`✅ Connected to blockchain: ${network.name} (Chain ID: ${network.chainId})`);
    } catch (error) {
        console.error("❌ Error connecting to blockchain:", error);
    }
}

// Verifică conexiunea imediat ce aplicația pornește
checkEthersConnection();


module.exports = app;

