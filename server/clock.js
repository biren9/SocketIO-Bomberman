const _ = require('lodash');

module.exports = {
    speed: 100,
    timer: null,
    queue: [],
    players: [],
    socket: null,
    map: [
        [0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1],
        [1, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1],
        [1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 1, 1, 1, 0, 0, 0, 1, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 1],
        [0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 0, 1, 0, 1],
        [0, 0, 0, 0, 0, 0, 2, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1],
        [0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 1, 0, 1, 1, 1, 1],
        [1, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1],
        [1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 0, 0, 1],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 1, 0, 1],
        [0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1]
    ],



    start: function() {
        if (this.timer !== null) return; // prevent starting timer multiple times
        var self = this; // reference for this

        timer = setInterval(function() {
            var element;

            //Render Map for every action in Queue
            while ((element = self.queue.shift()) !== undefined) {
                renderMap.PlayerInteraction(element.event, element.client, self);
            };

            //Render Map for every Bomb
            for(var p in self.players) {
              renderMap.bomeInteraction(self.players[p], self);
            }

            var pl = [];

            //Create an return array with every connected player
            for (p in self.players) {
                if (self.players[p].isConnected) {
                    pl.push({
                        id: self.players[p].id,
                        kills: self.players[p].kills,
                        X: self.players[p].X,
                        Y: self.players[p].Y
                    });
                } // Delete player who is disconnected
                else self.players.splice(self.players[p].id, 1);
            }

            //Return Object with new map
            self.socket.send({
                map: self.map,
                players: pl
            });

        }, this.speed);
    },



    stop: function() {
        clearInterval(timer);
        self = null;
        timer = null;
    },



    addClient: function(c, bombLeftOnField) {
        var bombLeftOnField = bombLeftOnField || []; //default value, Player has no bomb placed
        //Generate an array with free spots to spawn
        var freePlace = [];
        for (var i = 0; i < this.map.length; i++) {
            for (var j = 0; j < this.map[i].length; j++) {
                if (this.map[i][j] === 0) freePlace.push({
                    X: j,
                    Y: i
                });
            }
        }

        //Select a random place on the map
        let rand = Math.floor(Math.random() * freePlace.length);
        this.players[c.id] = {
            id: c.id, //Client id
            X: freePlace[rand].X, //spot on map
            Y: freePlace[rand].Y, //spot on map
            bombs: bombLeftOnField, //Bombs on field
            force: 3, //Bomb power
            explodeSpeed: 2000, //time until explosion
            explosionDuration: 200, //explosion duration
            kills: 0,
            isConnected: true
        }; // default 0 kills
    }
};


var renderMap = {
    PlayerInteraction: function(event, client, self) {

        if (Math.abs(event.X) <= 1 && Math.abs(event.Y) <= 1) { // no more than 1 step at a time

            //calc new position & save some values
            let nX = parseInt(self.players[client.id].X + event.X); // new X
            let nY = parseInt(self.players[client.id].Y + event.Y); // new Y

            if (nX >= 0 && nX < self.map[0].length && nY >= 0 && nY < self.map.length) { // prevent exit map
                if (self.map[nY][nX] !== undefined && self.map[nY][nX] === 0) { // prevent enter not empty spots
                    /*debug*/
                    console.log({
                        X: nX,
                        Y: nY
                    });

                    //Set new position
                    self.players[client.id].X = nX;
                    self.players[client.id].Y = nY;

                    if (event.B === 1) { //event.B = Bomb
                        let ms = Date.now(); // timestamp

                        self.players[client.id].bombs.push({
                            X: nX,
                            Y: nY,
                            isPlaced: false,
                            isExplode: false,
                            explodeTime: ms + self.players[client.id].explodeSpeed,
                            force: self.players[client.id].force,
                            explosionDuration: self.players[client.id].explosionDuration,
                            bombField: []
                        });
                    } else if (event.W === 1) { //Prevent placing blocks -> top left corner
                        if (nY > 1 || nX > 1) self.map[nY][nX] = 2; // Guaranteed find a spawn spot
                    }

                  }
            }
        }
    },
    bomeInteraction: function(client, self) {
      var b = self.players[client.id].bombs;

      for (var i = 0; i < b.length; i++) {
          console.log(b[i]);

          if (b[i].explodeTime >= Date.now()) { //Bomb on field
              if (!b[i].isPlaced) {
                  b[i].isPlaced = true; // Set placed on map to true
                  self.map[b[i].Y][b[i].X] = 3; // place bomb on map
              }
          } else if ((b[i].explodeTime + b[i].explosionDuration) >= Date.now()) { //Explosion
              if(!b[i].isExplode) {
                b[i].isExplode = true;
                self.map[b[i].Y][b[i].X] = 4; //Replace bomb with an explosion

                let up = true;
                let down = true;
                let left = true;
                let right = true;

                for (let j = 1; j <= b[i].force; j++) {
                    if (up && b[i].Y - j >= 0 && self.map[b[i].Y - j][b[i].X] !== 1) {
                        if (self.map[b[i].Y - j][b[i].X] === 2) up = false;
                        self.map[b[i].Y - j][b[i].X] = 4;
                        b[i].bombField.push({
                            X: b[i].X,
                            Y: b[i].Y - j,
                            id: client.id
                        });
                    } else up = false;
                    if (down && b[i].Y + j < self.map.length && self.map[b[i].Y + j][b[i].X] !== 1) {
                        if (self.map[b[i].Y + j][b[i].X] === 2) down = false;
                        self.map[b[i].Y + j][b[i].X] = 4;
                        b[i].bombField.push({
                            X: b[i].X,
                            Y: b[i].Y + j,
                            id: client.id
                        });
                    } else down = false;
                    if (left && b[i].X - j >= 0 && self.map[b[i].Y][b[i].X - j] !== 1) {
                        if (self.map[b[i].Y][b[i].X - 1] === 2) left = false;
                        self.map[b[i].Y][b[i].X - j] = 4;
                        b[i].bombField.push({
                            X: b[i].X - j,
                            Y: b[i].Y,
                            id: client.id
                        });
                    } else left = false;
                    if (right && b[i].X + j < self.map[0].length && self.map[b[i].Y][b[i].X + j] !== 1) {
                        if (self.map[b[i].Y][b[i].X + j] === 2) right = false;
                        self.map[b[i].Y][b[i].X + j] = 4;
                        b[i].bombField.push({
                            X: b[i].X + j,
                            Y: b[i].Y,
                            id: client.id
                        });
                    } else right = false;
                }
              }
          } else {
              self.map[b[i].Y][b[i].X] = 0; // Remove explosion
              for (let bf in b[i].bombField) {
                  console.log(b[i].bombField[bf].Y);
                  self.map[b[i].bombField[bf].Y][b[i].bombField[bf].X] = 0;
                  for (let p in self.players) {

                      //Compare players and explosion position
                      if (_.isEqual({
                              X: self.players[p].X,
                              Y: self.players[p].Y
                          }, {
                            X: b[i].bombField[bf].X,
                            Y: b[i].bombField[bf].Y
                          })) {
                          //Execute when position are equale
                          self.players[b[i].bombField[bf].id].kills += 1; // append a kill to the bomb owner
                          self.addClient(self.players[p], self.players[p].bombs); //Recalculate new coordinates
                      }
                  } //for let p in players
              } //for let bf in bombField
              self.players[client.id].bombs.splice(i, 1);
          }
      }
    }
};

/*setTimeout(function() { //Wait until explodeSpeed from client
                        let up = true;
                        let down = true;
                        let left = true;
                        let right = true;
                        let bombField = new Array();

                        map[nY][nX] = 4; //Replace bomb with an explosion
                        bombField.push({
                            X: nX,
                            Y: nY
                        }); //generate an array with the coordinates

                        for (let i = 1; i <= pl.force; i++) {
                            if (up && nY - i >= 0 && map[nY - i][nX] !== 1) {
                                if (map[nY - i][nX] === 2) up = false;
                                map[nY - i][nX] = 4;
                                bombField.push({
                                    X: nX,
                                    Y: nY - i
                                });
                            } else up = false;
                            if (down && nY + i < mapSizeY && map[nY + i][nX] !== 1) {
                                if (map[nY + i][nX] === 2) down = false;
                                map[nY + i][nX] = 4;
                                bombField.push({
                                    X: nX,
                                    Y: nY + i
                                });
                            } else down = false;
                            if (left && nX - i >= 0 && map[nY][nX - i] !== 1) {
                                if (map[nY][nX - 1] === 2) left = false;
                                map[nY][nX - i] = 4;
                                bombField.push({
                                    X: nX - i,
                                    Y: nY
                                });
                            } else left = false;
                            if (right && nX + i < mapSizeX && map[nY][nX + i] !== 1) {
                                if (map[nY][nX + i] === 2) right = false;
                                map[nY][nX + i] = 4;
                                bombField.push({
                                    X: nX + i,
                                    Y: nY
                                });
                            } else right = false;
                        }

                        socket.send({
                            map: map,
                            players: players
                        }); //Send to all clients

                        setTimeout(function() {
                            for (let b in bombField) {
                                map[bombField[b].Y][bombField[b].X] = 0;
                                for (let p in players) {
                                    if (_.isEqual({
                                            X: players[p].X,
                                            Y: players[p].Y
                                        }, bombField[b])) {
                                        socket.to(players[p].id).emit('message', 'Dead');
                                        createClient(players[p]); //Recalculate new coordinates
                                        //Check if player has not disconnected & update states
                                        if (players[client.id] !== undefined) players[client.id].kills += 1;
                                        if (players[p] !== undefined) players[p].kills = 0;
                                    }
                                } //for let p in players
                            } //for let b in bombField
                            socket.send({
                                map: map,
                                players: players
                            });
                        }, 200); //wait 200ms -> explode img
                    }, pl.explodeSpeed); // --> time until bomb explodes

            }
        }
    }
    socket.send({
        map: map,
        players: players
    });
});*/
