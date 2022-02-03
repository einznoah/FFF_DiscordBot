const express = require('express');
const hbs = require('express-handlebars');
const bodyParser = require("body-parser");
const path = require('path');
const http = require('http');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const basicAuth = require('express-basic-auth');

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
});

class WebSocket {

    constructor(httpPort, client) {
        this.httpPort = httpPort;
        this.client = client;
        this.app = express();

        // Register Handlebars instance as view engine
        this.app.engine('hbs', hbs.engine({
            extname: 'hbs',                     // Extension (*.hbs Files)
            defaultLayout: 'layout',            // Main layout -> layouts/layout.hbs
            layoutsDir: __dirname + '/layouts'  // Layouts directory -> layouts/
        }))
        // Set folder views/ as location for views files
        this.app.set('views', path.join(__dirname, 'views'))
        // Set hbs as view engine
        this.app.set('view engine', 'hbs')
        // Set public/ as public files root
        this.app.use(express.static(path.join(__dirname, 'public')))
        // Register bodyParser as parser for Post requests body in JSON-format
        this.app.use(bodyParser.urlencoded({ extended: false }));
        this.app.use(bodyParser.json());
        this.app.use(helmet());
        this.app.use(limiter);
        this.app.use(basicAuth({
            challenge: true,
            users: { 'noahn': 'testpw'}
        }));

        // Start websocket on port defined in constructors arguments
        const httpServer = http.createServer(this.app);
        httpServer.listen(httpPort);
        console.log(`Webserver listening on port ${httpPort}`)

        this.app.get('/', (req, res) => {
            let channels = [];
            const guild = this.client.guilds.cache.first();
            guild.channels.cache
                .filter(channel => channel.type === 'text')
                .forEach(channel => {
                    channels.push({id: channel.id, name: channel.name})
                })
            //this.client.guilds.cache.get('767409415326138408').channels
            //    .filter(c => c.type === 'text')
            //    .forEach(c => {
            //        channels.push({id: c.emojiDelete,  name: c.name})
            //    })
            res.render('index', { channels })
        })

        this.app.post('/sendMessage', (req, res) => {
            const channelId = req.body.channelId;
            const text = req.body.text;
            const channel = this.client.guilds.cache.first().channels.cache.get(channelId);
            if (channel) {
                channel.send(text);
                res.sendStatus(200);
            } else {
                res.sendStatus(406);
            }
        });
    }

}

module.exports = WebSocket