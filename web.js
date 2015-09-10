var express = require('express');
var bodyParser = require('body-parser');
var serveStatic = require('serve-static');
var multer = require('multer');
var _ = require('underscore');
var cluster = require('cluster');

var getConf = require('./config');
var Measurement = require("./measurement").measurement;
var loadMeasFile = require('./measurement').loadMeasFile;


var router = function(app) {

// ROUTES
// =========================================================================

    app.route('/api/measurements/')

    // Get the list of datasets
    .get(function(req, res, next) {
        Measurement.collection.distinct('measId', function(err, list) {
            if (err) {
                return res.status(500).send("Error with the database : " + err.message);
            }
            return res.status(200).send(list);
        });
    })

     // Insert the measurements file into the database
    .post(function (req, res) {
        loadMeasFile(req.files.dataFile.path, req.files.dataFile.mimetype, function (err) {
            if (err) {
                return res.status(400).send(err.message);
            }
            return res.status(200).send("Data successfully stored.");
        });
    });

// =========================================================================

    app.route('/api/measurements/:mId/exp/')

    // List all the columns for given datasets
    .get(function (req, res, next) {
        Measurement.collection.distinct('expId', {
            'measId': { '$in' : decodeURIComponent(req.params.mId).split(',') }
        },
        function (err, list) {
            if (err) {
                return res.status(500).send("Error with the database : " + err.message);
            }
            return res.status(200).send(list);
        });
    });

// =========================================================================

    app.route('/api/measurements/:mId/genes/')

    // List all the lines for given datasets
    .get(function (req, res, next) {
        Measurement.collection.distinct('geneId', {
            'measId': { '$in' : decodeURIComponent(req.params.mId).split(',') }
        },
        function (err, list) {
            if (err) {
                return res.status(500).send("Error with the database : " + err.message);
            }
            return res.status(200).send(list);
        });
    });

// =========================================================================

    app.route('/api/measurements/:mId')

    // Get the values for given datasets, possibly filtered by lines and/or columns
    .get(function (req, res, next) {
        var filter = {'measId': { '$in' : decodeURIComponent(req.params.mId).split(',') } };

        if (req.query.geneId){
            var geneIds = typeof req.query.geneId == 'string' ? [req.query.geneId] : req.query.geneId;
            filter['geneId'] = {'$in': geneIds};
        }

        if (req.query.expId){
            var expIds = typeof req.query.expId == 'string' ? [req.query.expId] : req.query.expId;
            filter['expId'] = {'$in': expIds};
        }

        Measurement.collection.find(filter).toArray(function (err, list) {
            if (err) {
                return res.status(500).send("Error with the database : " + err.message);
            }
            return res.status(200).send(list);
        });
    })

    // Remove the given datasets from the database
    .delete(function (req, res, next) {
        var datasets = {'measId': { '$in' : decodeURIComponent(req.params.mId).split(',') } };
        
        Measurement.collection.remove(datasets, function (err, list) {
            if (err) {
                return res.status(500).send("Error with the database : " + err.message);
            }
            return res.status(200).send("Data successfully removed.");
        });
    });
};

var WebServer = function(contacts) {
    var app = express();
    app.use(bodyParser.urlencoded({
        extended: false
    }));
    app.use(bodyParser.json());
    app.use(serveStatic('public', {
        'index': ['index.html']
    }));
    app.use(multer({
        dest: './uploads/',
        rename: function (fieldname, filename) {
            return filename.replace(/\W+/g, '-').toLowerCase() + Date.now();
        }
    }));
    var webPort = getConf("web.port",8080);
    var webHost = getConf("web.host", "localhost");
    server = app.listen(webPort, webHost);
    router(app);
    console.log("Server listening to " + webHost + ":" + webPort);
};

var launch = function() {
    WebServer();
};

module.exports = launch;
