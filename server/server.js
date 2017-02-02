/*
  Copyright © 2017 [Biren Gil]
*/
const path = require('path');
const express = require('express');
const http = require('http');
const io = require('socket.io');
const port = 8080;
const _ = require('lodash');
const maxPlayers = 60;
var gameClock = require('./clock.js');

String.prototype.trunc = function(n) {
  var ret = this.substr(0, n - 1);
  if(this.length === 0) {
    return null;
  }
  else if(this.length > n) {
    return ret + "...";
  }
  else return ret;
};


var app = express();
const publicDir = path.join(__dirname, '../client');

app.use(express.static(publicDir));
console.log(publicDir);

var server = http.createServer(app);
server.listen(port); // Start the server at const port

// Create a Socket.IO instance, passing it our server
var socket = io.listen(server);

//define game logic specifictions
gameClock.socket = socket;
gameClock.speed = 50; // default = 100
gameClock.start();

// Add a connect listener
socket.on('connection', function(client) {
    client.username = client.handshake.query.username.trunc(15);
    if (_.size(gameClock.players) >= maxPlayers) {
        client.send({
            status: "full"
        });
        client.disconnect();
        return;
    }
    console.log('Connection to client established ');
    gameClock.addClient(client);

    // Now listen to messages to be received
    client.on('message', function(event) {
        gameClock.queue.push({
            event: event,
            client: client
        }); // add request to queue
    });

    client.on('disconnect', function() {
        console.log('Client ready for disconnect');
        gameClock.scheudleDisconnect(client.id); // Player ready for disconnect
    });
});

console.log('Server running at http://127.0.0.1:' + port + '/');
