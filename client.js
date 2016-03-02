var JsonTcpSocket = require('json-tcp-socket');
var shortid = require('shortid');
var norma = require("norma");


module.exports = function client(conf){
    if(typeof conf === 'undefined') conf = {};
    
    // Load configuration
    var config = {
        ip          : (conf.hasOwnProperty('ip'))   ? conf.ip   : '0.0.0.0',
        port        : (conf.hasOwnProperty('port')) ? conf.port : 6789,
        tls         : (conf.hasOwnProperty('tls'))  ? conf.tls  : false,
        keepAlive   : (conf.hasOwnProperty('keepAlive'))    ? conf.keepAlive    : 10000,
        timeout     : (conf.hasOwnProperty('timeout'))      ? conf.timeout      : 75000,
    };
    
    if(config.hasOwnProperty('tls')) config.rejectUnauthorized = true;
    if(conf.hasOwnProperty('rejectUnauthorized')) config.rejectUnauthorized = conf.rejectUnauthorized;
    
    // Start client
    var client = {};
    client.JsonTcpSocket = new JsonTcpSocket({tls: config.tls});
    client.socket = new client.JsonTcpSocket.Socket();
    client.callbacks = {};
    client.addPattern = function(){
        var args = norma('o,s?,a?,f',arguments);
        
        var pattern = args[0];
        var topics  = args[2] || [args[1] || 'default'];
        var cb      = args[3];
        
        var msg = {
            topic: topics,
            callbackId: shortid.generate(),
            pattern: pattern
        };
        
        client.callbacks[msg.callbackId] = cb;
        
        client.socket.write(msg);
        
        return msg;
    };
    
    client.remPattern = function(){
        var args = norma('o,s?,a?,s',arguments);
        
        var pattern     = args[0];
        var topics      = args[2] || [args[1] || 'default'];
        var callbackId  = args[3];
        
        var msg = {
            cmd: 'removePattern',
            topic: topics,
            callbackId: callbackId,
            pattern: pattern
        };
        
        delete client.callbacks[msg.callbackId];
        
        client.socket.write(msg);
    };
    
    client.send = function(){
        var args = norma('o,s?,a?,f',arguments);
        
        var data    = args[0];
        var topics  = args[2] || [args[1] || 'default'];
        var cb      = args[3];
        
        var msg = {
            topic: topics,
            callbackId: shortid.generate(),
            message: data
        };
        
        client.callbacks[msg.callbackId] = function(data){
            cb(data);
            delete client.callbacks[msg.callbackId];
        };
        
        client.socket.write(msg);
    };
    
    client.sendToClient = function(){
        var args = norma('s,s,o,o?',arguments);
        
        var toClient    = args[0];
        var callbackId  = args[1];
        var message     = args[2];
        var request     = args[3];
        
        var envelope = {
            toClient: toClient,
            message: message
        };
        
        if(request)    envelope.request    = request;
        if(callbackId) envelope.callbackId = callbackId;
        
        client.socket.write(envelope);
    };
    
    client.reply = function(){
        var args = norma('o,o',arguments);
        
        var res  = args[0];
        var req  = args[1];
        
        client.sendToClient(req.fromClient, req.callbackId, res, req );
    };
    
    
    // Handle data
    client.socket.on('data', function (data) {
        // Respond to heartbeats
        if(data.hasOwnProperty('heartbeat')){
            console.log('Received heartbeat.');
            return;
        }
        
        if(data.hasOwnProperty('providerId')){
            client.callbacks[data.providerId](data, {});
        }
        else if(data.hasOwnProperty('request')){
            client.callbacks[data.callbackId](data.message, data.request);
        }
        
    });
    
    // Handle connecting
    client.socket.on('connect', function () {
        console.log('Connected!');
        var heartbeat = function(){
            client.socket.write({heartbeat:true});
        };
        
        client.timeoutTimer = setInterval(heartbeat, config.keepAlive);
        
    });
    
    // Handle disconnecting
    client.socket.on('close', function () {
        console.log('Disconnected!');
        clearInterval(client.timeoutTimer);
    });
    
    client.socket.socket.setTimeout( config.timeout, function(){
        console.log('Server timed out!');
        client.socket.socket.destroy();
    });
    
    client.socket.connect(config.port, config.ip);
    
    return client;
};