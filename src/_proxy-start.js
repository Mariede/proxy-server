'use strict';

// -------------------------------------------------------------------------
// Modulos de inicializacao
const express = require('express');
const app = express();
const fs = require('fs');
const http = require('http');
const https = require('https');
const log4js = require('log4js');
const proxy = require('http-proxy');

// Arquivo config
const serverConfig = require('./server-config');

// Root do servidor
const serverRoot = __dirname;
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
		const getAppCert = () => {
			const result = {};

			// Certificado digital para o servidor de proxy
			if (serverConfig.secure.isHttps) {
				const certPath = `${serverRoot + serverConfig.secure.certFolder}/`;
				const certKey = certPath + serverConfig.secure.certKey;
				const certPublic = certPath + serverConfig.secure.certPublic;

				result.key = fs.readFileSync(certKey, 'utf8');
				result.public = fs.readFileSync(certPublic, 'utf8');
			}

			return result;
		};

		const cert = getAppCert();

		const pServerCheck = {
			protocol: (serverConfig.secure.isHttps ? https : http),
			serverOptions: (serverConfig.secure.isHttps ? {
				key: cert.key,
				cert: cert.public
			} : {}),
			protocolInfo: (serverConfig.secure.isHttps ? 'https://' : 'http://')
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
		const serversToProxy = serverConfig.proxyRoutes;

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

				// Certificado digital para os redirecionamentos
				if (toProtocol.includes('https')) {
					const certPfx = (serverData.certPfx ? serverData.certPfx : undefined);

					if (certPfx) {
						target.pfx = fs.readFileSync(`${serverRoot}/${certPfx}`, 'utf8');
						target.passphrase = String(serverData.passphrase || '');
					}
				}

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
