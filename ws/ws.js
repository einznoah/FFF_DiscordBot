const express = require('express')
const hbs = require('express-handlebars')
const bodyParser = require("body-parser");
const path = require('path')

class WebSocket {

    constructor(port, client) {
        this.port = port
        this.client = client
        this.app = express()

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

        // Start websocket on port defined in constructors arguments
        this.server = this.app.listen(port, () => {
            console.log("Websocket API set up at port " + this.server.address().port)
        })

        this.app.get('/', (req, res) => {
            res.render('index', { title: this.client.user.tag, body: `${this.client.user.tag} Webinterface: Uptime: ${(this.client.uptime / 1000).toFixed()} seconds`})
        })
    }

}

module.exports = WebSocket