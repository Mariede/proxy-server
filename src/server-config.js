'use strict';

const serverConfig = {
	secure: {
		isHttps: false,
		certFolder: '/cert',
		certKey: 'cert.key',
		certPublic: 'cert.pem'
	},
	port: 80,
	host: 'localhost',
	backlog: 511,
	params: {
		maxConnections: 100,
		timeout: 0,
		keepAliveTimeout: 15000,
		maxHeadersCount: 2000,
		headersTimeout: 60000
	},
	proxyRoutes: [
		{ path: '/APP1', toProtocol: 'http://', toHost: 'localhost', toPort: 5000 },
		{ path: '/APP2', toProtocol: 'http://', toHost: 'localhost', toPort: 5010 }
	]
};

module.exports = serverConfig;
