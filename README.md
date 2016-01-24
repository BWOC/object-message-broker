# object-message-broker
A simple object pattern based message broker.

## Usage as Standalone Server
```
npm install pattern-message-broker
cd node_modules/pattern-message-broker
npm start
```

## Usage as a required server
```
var pmb = require('pattern-message-broker').server({ // Optional config object
	ip: '0.0.0.0',
	port: 6789,
	tls: false
});
pmb.server		// Server object
pmb.patterns	// Topics and their pattern matchers
```

## Usage as client
```
var pmb = require('pattern-message-broker').client({ // Optional config object
	ip: '0.0.0.0',
	port: 6789,
	tls: false
});

// Connect to the server and start requesting messages with the given pattern in the given topics
//	Topic (String or Array, Optional, Defaults to: 'default')
//		Topic or topics to receive messages from.
//	Pattern (Object, Optional, Defaults to an empty object)
//		An object expressing required properties to be matched.
//		property: '*' denotes that the property only must exist.
//	Processor (Function. required)
//		
pmb.receive("", 'default', function(meta, data){

});

```
