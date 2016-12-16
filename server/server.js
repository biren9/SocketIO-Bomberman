// Require HTTP module (to start server) and Socket.IO
const path = require('path');
const express = require('express');
const http = require('http');
const io = require('socket.io');
const port = 8080;
const _ = require('lodash');
const maxPlayers = 60;


var app = express();
const publicDir = path.join(__dirname, '../client');

app.use(express.static(publicDir));
console.log(publicDir);

var server = http.createServer(app);
server.listen(port);// Start the server at const port

// Create a Socket.IO instance, passing it our server
var socket = io.listen(server);
var players = {};
var map = [[0,0,0,1,1,1,0,0,0,1,1,1,0,0,0,1,1,0,0,0,1],
           [1,1,0,0,0,0,0,1,0,0,0,0,0,1,0,1,0,0,1,0,1],
           [1,1,1,1,1,0,0,0,1,1,0,1,1,1,0,0,0,1,1,0,0],
           [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,0,1],
           [0,1,1,1,1,1,0,1,1,1,0,1,1,1,0,1,0,0,1,0,1],
           [0,0,0,0,0,0,2,1,0,0,0,1,1,1,0,0,0,0,0,0,1],
           [0,0,0,1,1,1,0,0,0,1,1,1,1,0,0,1,0,1,1,1,1],
           [1,1,0,0,0,0,0,1,0,0,0,0,1,0,1,1,0,1,0,0,1],
           [1,1,1,1,1,0,0,0,1,1,0,1,0,0,1,1,0,0,0,0,1],
           [0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,0,1,0,1],
           [0,1,1,1,1,1,0,1,1,1,0,1,0,0,0,0,0,0,0,0,1],
           [0,0,0,0,0,0,0,0,0,0,0,1,0,1,1,1,1,1,1,1,1]];

var mapSizeX = map[0].length;
var mapSizeY = map.length;
let randX;
let randY;
// Add a connect listener
socket.on('connection', function(client){
    if(_.size(players) >= maxPlayers) {
      client.send({status: "full"});
      client.disconnect();
      return;
    }
    console.log('Connection to client established ');
    var createClient = function(c) {
      var c = c || client;

      //Generate an array with free spots to spawn
      var freePlace = new Array();
      for (var i = 0; i < map.length; i++) {
        for (var j = 0; j < map[i].length; j++) {
          if(map[i][j] === 0) freePlace.push({X: j, Y: i});
        }
      }

      //Select a random place on the map
      let rand = Math.floor(Math.random() * freePlace.length);
      players[c.id] = {id: c.id, X: freePlace[rand].X, Y: freePlace[rand].Y, force: 3, explodeSpeed: 2000, kills: 0};
      socket.send({map: map, players: players});
    };
    createClient();

    // Success!  Now listen to messages to be received
    client.on('message', function(event) {
        if(players[client.id] === undefined) return;//if player has disconnected
        if(Math.abs(event.X) <= 1 && Math.abs(event.Y) <= 1) { // no more than 1 step at a time

          //calc new position & save some values
          let nX = parseInt(players[client.id].X + event.X);
          let nY = parseInt(players[client.id].Y + event.Y);
          let pl = {};
              pl.force = players[client.id].force;
              pl.explodeSpeed = players[client.id].explodeSpeed;

          if(nX >= 0 && nX < map[0].length && nY >= 0 && nY < mapSizeY ) { // prevent exit map
            if(map[nY][nX] !== undefined && map[nY][nX] === 0) {// prevent enter wall
              console.log({X: nX, Y: nY});

              //Set new position
              players[client.id].X = nX;
              players[client.id].Y = nY;
              if(event.B === 1) { //event.B = Bombe
                map[nY][nX] = 3;// place bomb on map
                setTimeout(function () {//Wait until explodeSpeed from client
                  let up=true;
                  let down=true;
                  let left=true;
                  let right=true;
                  let bombField = new Array();
                  map[nY][nX] = 4; //Replace bombe with an explosion
                  bombField.push({X: nX, Y: nY}); //generate an array with the coordinates
                  for (let i = 1; i <= pl.force; i++) {
                    if(up && nY-i >= 0 && map[nY-i][nX] !== 1) {
                      if(map[nY-i][nX] === 2) up = false;
                      map[nY-i][nX] = 4;
                      bombField.push({X: nX, Y: nY-i});
                    } else up = false;
                    if(down && nY+i < mapSizeY && map[nY+i][nX] !== 1) {
                      if(map[nY+i][nX] === 2) down = false;
                      map[nY+i][nX] = 4;
                      bombField.push({X: nX, Y: nY+i});
                    } else down = false;
                    if(left && nX-i >= 0 && map[nY][nX-i] !== 1) {
                      if(map[nY][nX-1] === 2) left = false;
                      map[nY][nX-i] = 4;
                      bombField.push({X: nX-i, Y: nY});
                    } else left = false;
                    if(right && nX+i < mapSizeX && map[nY][nX+i] !== 1) {
                      if(map[nY][nX+i] === 2) right = false;
                      map[nY][nX+i] = 4;
                      bombField.push({X: nX+i, Y: nY});
                    } else right = false;
                  }
                  socket.send({map: map, players: players});//Send to all clients
                  setTimeout(function () {
                    for(let b in bombField) {
                      map[bombField[b].Y][bombField[b].X] = 0;
                      for(let p in players) {
                        if(_.isEqual({X: players[p].X, Y:players[p].Y}, bombField[b] )) {
                          socket.to(players[p].id).emit('message', 'Dead');
                          createClient(players[p]);//Recalculate new coordinates
                          //Check if player has not disconnected & update states
                          if(players[client.id] !== undefined) players[client.id].kills += 1;
                          if(players[p] !== undefined) players[p].kills = 0;
                        }
                      }//for let p in players
                    }//for let b in bombField
                    socket.send({map: map, players: players});
                  }, 200);//wait 200ms -> explode img
                }, pl.explodeSpeed); // --> time until bombe explodes
              }
              else if(event.W === 1) {//Prevent placing blocks -> top left corner
                if(nY > 1 || nX > 1) map[nY][nX] = 2;
              }
            }
          }
        }
        socket.send({map: map, players: players});
    });

    client.on('disconnect',function(){
        console.log('Client has disconnected');
        delete players[client.id];
        socket.send({map: map, players: players});
    });
});

console.log('Server running at http://127.0.0.1:' + port + '/');
