# proxy-server

Servidor genérico de proxy em express NODE.js para uma ou mais aplicações

* Rodar local:
```
npm install
npm start
```

### Arquivo server-config.js

Arquivo de configurações

* **secure**: certificado digital para o servidor de proxy
    + apenas se **isHttps** for true, usa as chaves **certKey** e **certPublic**
    + este é o https que o usuário acessa na url do navegador

* **host**, **port**, **backlog**, **params**: configurações de uso para o servidor de proxy

* **proxyRoutes**: é uma array de objetos, onde cada objeto especifica uma rota para redirecionamento (proxy)
    + **path**: URL base que define a origem de-para do redirecionamento
    + **toProtocol**: protocolo de destino (utilizar exatamente http: ou https:)
    + **toHost**: host de destino
    + **toPort**: porta de destino
    + **certPfx**: apenas se **toProtocol** for https:// informa o caminho para o certificado digital do cliente (destino)
   	+ **passphrase**: apenas se **toProtocol** for https:// (é associada na criação do arquivo .pfx)
