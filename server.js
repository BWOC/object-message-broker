var JsonTcpSocket = require('json-tcp-socket');
var shortid = require('shortid');
var patrun = require('patrun');
var norma = require("norma");
var fs = require("fs");

// Pattern Object Constructor
// Valid options are: all, roundrobin, random
var PatObj = function(pattern, parent, mode){
    
    this.funcs = {};
    this.mode = mode || 'roundrobin';
    this.pattern = pattern;
    this.parent = parent;
    this.lastSent = -1;
    this.add = function(id, func){
        this.funcs[id] = func;
        return id;
    };
    this.remove = function(id, func){
        // Iterate through the functions to find the function.
        delete this.funcs[id];
        
        // Remove this pattern if there are no functions left on this pattern.
        if(Object.keys(this.funcs).length < 1){
            this.parent.remove(this.pattern);
        }
    };
    this.send = function(data){
        // Force the mode to accepted modes.
        if(['all', 'random', 'roundrobin'].indexOf(this.mode) == -1){
            console.warn("Invalid pattern object mode!");
            console.warn("Allowed options are: all, random, roundrobin");
            console.warn("Using default: roundrobin");
            this.mode = 'roundrobin';
        }
        
        var keysArray = Object.keys(this.funcs);
        var providerId;
        
        // Send the data according to the mode.
        if(this.mode == 'roundrobin'){
            if(this.lastSent+1 >= keysArray.length) this.lastSent = -1;
            
            providerId = keysArray[++this.lastSent];
            
            data.providerId = providerId;
            this.funcs[providerId](data);
        }
        else if(this.mode == 'random'){
            providerId = keysArray[Math.floor( Math.random() * keysArray.length)];
            data.providerId = providerId;
            this.funcs[providerId](data);
        }
        else if(this.mode == 'all'){
            for(providerId in this.funcs){
                data.providerId = providerId;
                this.funcs[providerId](data);
            }
        }
    };
};

// Main server module
module.exports = function server(conf){
    if(typeof conf === 'undefined') conf = {};
    
    // Load configuration
    var config = {
        ip          : (conf.hasOwnProperty('ip'))           ? conf.ip           : '0.0.0.0',
        port        : (conf.hasOwnProperty('port'))         ? conf.port         : 6789,
        tls         : (conf.hasOwnProperty('tls'))          ? conf.tls          : false,
        timeout     : (conf.hasOwnProperty('timeout'))      ? conf.timeout      : 60000,
    };
    if(config.hasOwnProperty('key')) conf.key = fs.readFileSync(config.key);
    if(config.hasOwnProperty('cert')) conf.key = fs.readFileSync(config.cert);
    
    // Start server
    var server = {};
    server.connections = {};
    server.JsonTcpSocket = new JsonTcpSocket({tls: config.tls});
    server.server = new server.JsonTcpSocket.Server();
    server.patterns = {}; // By namespace
    
    server.listen = function listen(port, ip){
        server.server.listen(port || config.port, ip || config.ip);
    };
    
    server.server.on('connection', function (socket) {
        var patterns = {};
        var send = function send(data) {
            // Send data to client
            socket.write(data);
        };
        
        
        // Assigning and registering a socket id;
        socket.id = shortid.generate();
        server.connections[socket.id] = socket;
        console.log('client connected: ', socket.id, socket.socket.remoteAddress);
        
        // Handle data from this connection
        socket.on('data', function (data) {
            // Respond to heartbeats
            if(data.hasOwnProperty('heartbeat')){
                console.log('Received heartbeat.');
                socket.write({heartbeat:true});
                return;
            }
            
            
            var topic;
            var patobj;
            
            
            console.log('Data Received:', data);
            
            // Send data back to a client if applicable
            if(data.hasOwnProperty('toClient')){
                console.log('Processing direct message');
                
                if(server.connections.hasOwnProperty(data.toClient)){
                    console.log('Client Exists');
                    
                    // Set fromClient in data
                    data.fromClient = socket.id;
                    
                    // Send data
                    server.connections[data.toClient].write(data);
                }
            // Process message with pattern system
            }else{
                
                // Force default topic
                if(!data.hasOwnProperty('topic')){
                    data.topic = ['default'];
                }
                
                // Force topic into array
                if(!Array.isArray(data.topic)){
                    data.topic = [String(data.topic)];
                }
                
                // Process message for all topics
                for(var t in data.topic){
                    topic = data.topic[t];
                    
                    // Create a new Service if a pattern is given
                    if(data.hasOwnProperty('pattern')){
                        console.log('pattern exists');
                        
                        // Create topic if it doesn't exist
                        if(!server.patterns.hasOwnProperty(topic)) server.patterns[topic] = patrun({gex:true});
                        
                        // Check for pattern in topic
                        patobj = server.patterns[topic].find(data.pattern, true);
                        
                        // Add pattern to topic if it doesn't exist
                        if(!patobj){
                            patobj = new PatObj(data.pattern, server.patterns[topic]);
                            server.patterns[topic].add(data.pattern, patobj, data.mode );
                        }
                        
                        // Add function to pattern
                        console.log('Adding Pattern:', data.pattern, 'Add Status:', patobj.add(data.callbackId, send));
                        //patobj.add(data.callbackId, send);
                        
                    }
                    
                    // Send data to an appropriate Service if a message is given
                    if(data.hasOwnProperty('message')){
                        console.log('message exists');
                        
                        // Check if Topic exists
                        if(server.patterns.hasOwnProperty(topic)){
                            console.log('topic exists');
                            
                            
                            // Set fromClient in data
                            data.fromClient = socket.id;
                            
                            // Send the data
                            var pattern = server.patterns[topic].find(data.message);
                            
                            if(pattern !== null){
                                pattern.send(data);
                            }
                        }
                    }
                }
            }
        });
        
        socket.socket.setTimeout( config.timeout, function(){
            console.log('client timed out: ', socket.id, socket.socket.remoteAddress);
            socket.socket.destroy();
        });
        
        socket.socket.on('close', function (had_error) {
            console.log('client disconnected: ', socket.id, socket.socket.remoteAddress);
            
            // Remove all of the patterns added by this socket.
            for (var pattern in patterns){
                server.patterns.remove(patterns[pattern]);
            }
            
            // Remove the socket from the connections
            delete server.connections[socket.id];
        });
    });
    
    return server;
};