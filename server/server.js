// Require HTTP module (to start server) and Socket.IO
var http = require('http');
var io = require('socket.io');
var port = 5000;

// Start the server at port 8080
var server = http.createServer(function(request, response){
    // Send HTML headers and message
    response.writeHead(200,{ 'Content-Type': 'text/html' });
    response.end();
});

server.listen(port);

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
    console.log('Connection to client established ');
    var createClient = function(c) {
      var c = c || client; var count = 0;
      var freePlace = new Array();

      for (var i = 0; i < map.length; i++) {
        for (var j = 0; j < map[i].length; j++) {
          if(map[i][j] === 0) freePlace.push({X: j, Y: i});
        }
      }
      let rand = Math.floor(Math.random() * freePlace.length);

      players[c.id] = {id: c.id, X: freePlace[rand].X, Y: freePlace[rand].Y, force: 3, explodeSpeed: 2000, kills: 0};
      socket.send({map: map, players: players});
    };
    createClient();
    // Success!  Now listen to messages to be received
    client.on('message',function(event) {
        if(players[client.id] === undefined) return;
        if(Math.abs(event.X) <= 1 && Math.abs(event.Y) <= 1) { // no more than 1 step at ones
          let nX = parseInt(players[client.id].X + event.X);
          let nY = parseInt(players[client.id].Y + event.Y);
          let playerForce = players[client.id].force;
          if(nX >= 0 && nX < map[0].length && nY >= 0 && nY < mapSizeY ) { // prevent exit map
            if(map[nY][nX] !== undefined && map[nY][nX] === 0) {// prevent enter wall
              console.log({X: nX, Y: nY});
              players[client.id].X = nX;
              players[client.id].Y = nY;
              if(event.B === 1) {
                map[nY][nX] = 3;
                setTimeout(function () {
                  let up=true;
                  let down=true;
                  let left=true;
                  let right=true;
                  let bombField = new Array();
                  map[nY][nX] = 4;
                  bombField.push({X: nX, Y: nY});
                  for (var i = 1; i <= playerForce; i++) {
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
                  socket.send({map: map, players: players});
                  setTimeout(function () {
                    for(let b in bombField) {
                      map[bombField[b].Y][bombField[b].X] = 0;
                      for(let p in players) {
                        if(JSON.stringify({X: players[p].X, Y:players[p].Y}) === JSON.stringify(bombField[b])) {
                          socket.to(players[p].id).emit('message', 'Dead');
                          createClient(players[p]);
                          if(players[client.id] !== undefined) players[client.id].kills += 1;
                          if(players[p] !== undefined) players[p].kills = 0;
                        }
                      }
                    }
                    socket.send({map: map, players: players});
                  }, 200);
                }, players[client.id].explodeSpeed);
              }
              else if(event.W === 1) {
                if(nY > 1 || nX > 1) map[nY][nX] = 2;
              }
            }
          }
        }
        socket.send({map: map, players: players});
    });

    client.on('disconnect',function(){
        console.log('Server has disconnected');
        delete players[client.id];
        socket.send({map: map, players: players});
    });
});

console.log('Server running at http://127.0.0.1:' + port + '/');
