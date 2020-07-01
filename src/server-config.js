'use strict';

const serverConfig = {
	secure: {
		isHttps: true,
		certFolder: '/cert',
		certKey: 'cert.key',
		certPublic: 'cert.pem'
	},
	port: 443,
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
		{ path: '/APP1', toProtocol: 'https:', toHost: 'localhost', toPort: 5000, certPfx: '/cert/clients/APP1/cert.pfx', passphrase: '123' },
		{ path: '/APP2', toProtocol: 'http:', toHost: 'localhost', toPort: 5010 }
	]
};

module.exports = serverConfig;
