#!/usr/bin/env node
var app = {
    server: function(conf){
        return require('./server.js')(conf);
    },
    client: function(conf){
        return require('./client.js')(conf);
    }
};

// Start server if executed directly.
if(require.main === module){
    var config = {};
    
    // Load configuration
    if(process.argv[2]){
        config = require(process.argv[2]);
    }
    
    // Start server
    app.server(config).listen();
    
}else{
    module.exports = app;
}