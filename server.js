/**
 * This page contains server script using express and socket.io
 * Log using winston. 
 * 
 * @project name: Bidhom
 * @module: bidding
 * @created on: July 26, 2021
 * @author: Gautam
 */

require('dotenv').config();
global.config = {
    SOCKET_PORT: process.env.SOCKET_PORT,
    DOMAIN_BASE: process.env.BASE_IP,
    SITE_BASE: process.env.PROTOCOL + process.env.DOMAIN,
    EMAIL_FROM: process.env.SITE_NAME + '<' + process.env.EMAIL_FROM + '>',
    EMAIL_HOST: process.env.EMAIL_HOST,
    EMAIL_PORT: process.env.EMAIL_PORT,
    EMAIL_USERNAME: process.env.EMAIL_USERNAME,
    EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,
    DB_HOST: process.env.DATABASE_HOST,
    DB_NAME: process.env.DATABASE_NAME,
    DB_USER: process.env.DATABASE_USERNAME,
    DB_PASS: process.env.DATABASE_PASSWORD,
    TIMEZONE: process.env.TIMEZONE,
    DEFAULT_TIMEZONE: process.env.DEFAULT_TIMEZONE,
    API_URL: process.env.API_URL,
    API_TOKEN: process.env.API_TOKEN,
    API_PORT: process.env.API_PORT,
    API_PROTOCOL: process.env.API_PROTOCOL
};

const fs = require('fs'); 
const http = require('http'); 
const https = require('https'); 
const redis = require('socket.io-redis');
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const bid = require('./app/bid');
const insider = require('./app/insider');
const logger = require('./app/logger');
var app = require('express')();

app.get('/', function(req, res) {
   res.sendfile('index.html');
});

/**
 * Setup server culester 
 */
if (cluster.isMaster) {
	console.log('Master Process ' + process.pid + ' is running.');
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }
    cluster.on('online', (worker) => {
        console.log('Worker Process ' + worker.process.pid + ' is online and listening.');
    });
    cluster.on('exit', (worker, code, signal) => {
        if (signal) {
            console.log('Worker Process ' + worker.process.pid + ' was killed by signal: ' + signal + '.');
            cluster.fork();
        } else if (code) {
            console.log('Worker Process ' + worker.process.pid + ' has died with code: ' + code + '.');
            cluster.fork();
        }
    });

}
else{
	var server = new https.createServer({
		'key' : fs.readFileSync( process.env.CA_KEY_FILE_PATH ),
		'cert': fs.readFileSync( process.env.CA_CERT_FILE_PATH ),
		// 'ca'  : fs.readFileSync( '/etc/ssl/certs/ca-certificates.crt'   ),
		'requestCert': false,
		'rejectUnauthorized': false
		},function (request, response) {
		
		console.log("server is running at "+global.config.SOCKET_PORT)
    }).listen(global.config.SOCKET_PORT);
}

// const io = require('socket.io').listen(server, {transports: ["websocket", "xhr-polling", "htmlfile", "jsonp-polling"]});
const io = require('socket.io')(server, {transports: ["websocket", "xhr-polling", "htmlfile", "jsonp-polling"]});

/** configure redis with socket */
io.adapter(redis({host: process.env.REDIS_HOST, port: process.env.REDIS_PORT}));	

/** Request handler  */
var watcher = 0;
var property_id = '';
io.on('connection', function(socket){
watcher++;
console.log("Socket connected")
socket.emit('newconnection',{ description: 'Hey, welcome!'});
socket.on('propertyWatcher',function(data){
    
    property_id = data.property_id;
    user_id = data.user_id;
    unique_room_id = property_id+'_'+user_id;
    socket.join(unique_room_id);
    bid.propertyWatcher(socket,data);
});
socket.on('removePropertyWatcher',function(data){
    
    property_id = data.property_id;
    user_id = data.user_id;
    bid.removePropertyWatcher(socket,data);
});
socket.on('checkAuctionStatus', function (data) {
    bid.checkAuctionStatus(socket,data);
});
socket.on('checkAuctionEnd', function (data) {
    bid.checkAuctionEnd(socket,data);
});
// socket.broadcast.emit("hello", "world");


socket.on('loadsession', function () {
    logger.log("info", "Session started successfully.");
    io.sockets.emit('initNodes', "");
});

/**
 * Check bid amount at user end
 */

socket.on('checkBid',function(data){
    bid.checkBid(socket,data);
    //console.log("---->Check Bid");
})

socket.on('checkInsiderBid',function(data){
    bid.checkInsiderBid(socket,data);
    //console.log("---->Check Bid");
})

socket.on('deleteCurrentBid',function(data){
    bid.deleteCurrentBid(socket,data);
    //console.log("---->Check Bid");
})


/**
 * Check auction status based on time and mark sold or ended etc..
 */
socket.on('checkMyBid',function(data){
    bid.checkMyBid(socket,data);
})


/**
 * Check auction dashboard
 */
socket.on('checkAuctionDashboard',function(data){
    bid.checkAuctionDashboard(socket,data);
})

/**
 * Check insider auction dashboard
 */
 socket.on('checkInsiderAuctionDashboard',function(data){
    bid.checkInsiderAuctionDashboard(socket,data);
})

/**
 * New bidding..
 */
socket.on('addNewBid',function(data){
    bid.addNewBid(socket,data);
})


/**
 * Check bid amount at user end
 */
socket.on('addBid',function(data){
    bid.addBid(socket,data);
    console.log("---->Add Bid");
    console.log(data);
})

/**
 * Check bid amount at user end
 */
socket.on('bidHistory',function(data){
    bid.bidHistory(socket,data);
     // console.log("---->History Bid");
})

/**
 * Check auction status based on time and mark sold or ended etc..
 */
socket.on('checkAuction',function(data){
    bid.checkAuction(socket,data);
})


/**
 * Check auction data, .
 */
socket.on('checkAuctionData',function(data){
    bid.checkAuctionData(socket, data);
})

socket.on('test',function(){
    bid.test(socket);
})

socket.on('watcher',function(){
    bid.watcher(socket);
})


socket.on('loadChatRooms',function(data){
    bid.loadChatRooms(socket, data);
})

socket.on('loadChatRoomConversation',function(data){
    bid.loadChatRoomConversation(socket, data);
})

socket.on('sendMessageToUser', function(data){
    bid.sendMessageToUser(socket, data)

})

socket.on('userMessageCount', function(data){
    bid.userMessageCount(socket, data)

})


//-------------Insider Hybrid Auction---------
socket.on('dutchAuction', function(data){
    insider.dutchAuction(socket, data)
})

//-------------Insider Hybrid Rate Decrease---------
socket.on('dutchAuctionRateDecrease', function(data){
    insider.dutchAuctionRateDecrease(socket, data)
})

//-------------Dutch ended property check---------
socket.on('dutchAuctionEnded', function(data){
    insider.dutchAuctionEnded(socket, data)
})

//-------------Insider Hybrid Sealed Bid Auction---------
socket.on('sealedAuction', function(data){
    insider.sealedAuction(socket, data)
})

//-------------Insider Hybrid Sealed Bid Ended---------
socket.on('sealedAuctionEnded', function(data){
    insider.sealedAuctionEnded(socket, data)
})


//-------------English Auction---------
socket.on('englishAuction', function(data){
    insider.englishAuction(socket, data)
})


//-------------English Auction Ended---------
socket.on('englishAuctionEnded', function(data){
    insider.englishAuctionEnded(socket, data)
})

//-------------Insider User Dashboard-------
socket.on('insiderUserDashboard',function(data){
    insider.insiderUserDashboard(socket,data);
})


//socket.emit('newclientconnect',{ description: 'Hey, welcome!'});
//socket.broadcast.emit('newclientconnect',{ description: 'clients connected!'})
try{
    socket.emit('newclientconnect',{ description: 'Hey, welcome!!'});
    socket.broadcast.emit('newclientconnect',{ description: 'Testing'})
}catch(err){
    console.log(err.message)
}

socket.on('disconnect', function () {
  console.log('Socket disconnected');
});
  
});







