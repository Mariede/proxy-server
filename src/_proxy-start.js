'use strict';

// -------------------------------------------------------------------------
// Modulos de inicializacao
const express = require('express');
const app = express();
const fs = require('fs');
const http = require('http');
const https = require('https');
const log4js = require('log4js');
const path = require('path');
const proxy = require('http-proxy');
// -------------------------------------------------------------------------

const startProxy = () => {
	return new Promise((resolve, reject) => {
		// Logs --------------------------------------------------
		log4js.configure(
			{
				appenders: {
					consoleAppender: {
						type: 'console'
					}
				},
				categories: {
					default: {
						appenders: ['consoleAppender'], level: 'all'
					}
				}
			}
		);

		// Servidor de proxy - configuracoes ---------------------
		const getAppCert = () => { // Certificado digital (apenas se ativo)
			const result = {};

			if (serverConfig.isHttps) {
				const certPath = path.resolve(__dirname, '/cert');
				const certKey = `${certPath}/cert.key`;
				const certPublic = `${certPath}/cert.pem`;
				const certPfx = `${certPath}/cert.pfx`;

				result.key = fs.readFileSync(certKey, 'utf8');
				result.public = fs.readFileSync(certPublic, 'utf8');
				result.pfx = fs.readFileSync(certPfx, 'utf8');
			}

			return result;
		};

		const serverConfig = {
			isHttps: false,
			port: 80,
			host: 'localhost',
			backlog: 511,
			params: {
				maxConnections: 100,
				timeout: 0,
				keepAliveTimeout: 15000,
				maxHeadersCount: 2000,
				headersTimeout: 60000
			}
		};

		const cert = getAppCert();

		const pServerCheck = {
			protocol: (serverConfig.isHttps ? https : http),
			serverOptions: (serverConfig.isHttps ? {
				key: cert.key,
				cert: cert.public
			} : {}),
			protocolInfo: (serverConfig.isHttps ? 'https://' : 'http://')
		};

		const listenOptions = {
			port: serverConfig.port,
			host: serverConfig.host,
			backlog: serverConfig.backlog
		};

		// Cria servidor de proxy --------------------------------
		const _server = pServerCheck.protocol.createServer(pServerCheck.serverOptions, app);

		_server.maxConnections = serverConfig.params.maxConnections;
		_server.timeout = serverConfig.params.timeout;
		_server.keepAliveTimeout = serverConfig.params.keepAliveTimeout;
		_server.maxHeadersCount = serverConfig.params.maxHeadersCount;
		_server.headersTimeout = serverConfig.params.headersTimeout;

		// Proxy -------------------------------------------------
		const wsProxy = proxy.createProxyServer(
			{
				secure: false,
				ws: true
			}
		);

		// Listener para erros de proxy
		wsProxy.on(
			'error',
			(err, req, res) => {
				log4js.getLogger('default').error(err.stack || err);
				res.status(500).send(`Rota não pode ser redirecionada: ${err.code}`);
			}
		);

		// Array de objetos com rotas base a serem redirecionadas (proxy)
		const serversToProxy = [
			{ path: '/APP1', toProtocol: 'http://', toHost: 'localhost', toPort: 5000 },
			{ path: '/APP2', toProtocol: 'http://', toHost: 'localhost', toPort: 5010 }
		];

		serversToProxy.forEach(
			serverData => {
				const path = serverData.path;
				const toProtocol = serverData.toProtocol;
				const toHost = serverData.toHost;
				const toPort = serverData.toPort;
				const toOrigin = `${toProtocol}${toHost}:${toPort}`;
				const target = {
					protocol: toProtocol,
					host: toHost,
					port: toPort
				};

				app.all(
					`${path}/*`,
					(req, res) => {
						log4js.getLogger('default').info(`Redirecionando para ${path} (${toOrigin})`);

						wsProxy.web(
							req,
							res,
							{
								/* Para https ------- */
								// target: {
								// 	protocol: 'https:',
								// 	host: 'my-domain-name',
								// 	port: 443,
								// 	pfx: fs.readFileSync('path/to/certificate.p12'),
								// 	passphrase: 'password',
								// },
								/* ------------------ */
								target: target,
								cookiePathRewrite: false,
								changeOrigin: true
							}
						);
					}
				);

				_server.on(
					'upgrade',
					(req, socket, head) => {
						if (String(req.url || '').toLowerCase().includes(`${path.toLowerCase()}/`)) {
							log4js.getLogger('default').info(`Redirecionando (ws) para ${path} (${toOrigin})`);

							wsProxy.ws(
								req,
								socket,
								head,
								{
									target: target,
									cookiePathRewrite: false,
									changeOrigin: true
								}
							);
						}
					}
				);
			}
		);

		// Rotas -------------------------------------------------
		app.get(
			'/',
			(req, res) => {
				res.status(200).send(`Servidor de proxy está rodando em ${pServerCheck.protocolInfo}${listenOptions.host}:${listenOptions.port}...`);
			}
		);

		app.all(
			'*',
			(req, res) => {
				res.status(404).send('Essa rota não existe no servidor de proxy');
			}
		);
		// -------------------------------------------------------

		// Inicia servidor de proxy ------------------------------
		const serverStarter = () => {
			try {
				log4js.getLogger('default').info(`Servidor de proxy está rodando em ${pServerCheck.protocolInfo}${listenOptions.host}:${listenOptions.port}...`);
				resolve();
			} catch (err) {
				reject(err);
			}
		};

		_server.listen(listenOptions, serverStarter()).on(
			'error',
			err => {
				log4js.getLogger('default').error(err.stack || err);
			}
		);
	});
};
// -------------------------------------------------------------------------

startProxy()
.catch(
	err => {
		console.error(err.stack || err); // eslint-disable-line no-console
	}
);
