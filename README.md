# pmb
A simple object pattern based message broker.

## Usage as Standalone Server
```
npm install pmb
pmb
```

## Usage as a required server
```
var pmb = require('pmb').server({ // Optional config object
	ip: '0.0.0.0',
	port: 6789,
	tls: false,
    timeout : 60000
});
pmb.server		// Server object
pmb.patterns	// Topics and their pattern matchers
```

## Usage as client
```
var pmb = require('pattern-message-broker').client({ // Optional config object
	ip: '0.0.0.0',
	port: 6789,
	tls: false,
    timeout : 60000,
});

// Connect to the server and start requesting messages with the given pattern in the given topics
//	Pattern (Object, Optional, Defaults to an empty object)
//		An object expressing required properties to be matched.
//		property: '*' denotes that the property only must exist.
//	Topic (String or Array, Optional, Defaults to: 'default')
//		Topic or topics to receive messages from.
//	Processor (Function. required)
//		
pmb.receive({cmd:'test'}, 'default', function(meta, data){

});

```
