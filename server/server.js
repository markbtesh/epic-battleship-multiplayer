const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: 'http://192.168.1.19:4200',  // Allow requests from your Angular app
  methods: ['GET', 'POST'],  // Specify allowed methods
  credentials: true,  // If you need to send cookies or other credentials
}));

  const io = require('socket.io')(server, {
    cors: {
        origin: 'http://192.168.1.19:4200',  // Allow socket connections from your Angular app
        methods: ['GET', 'POST'],
        credentials: true,
    }
});

let games = {}; // Store active games
let waitingGameId = null; 

io.on('connection', (socket) => {
    console.log('A user connected: ', socket.id);



   socket.on('joinGame', (gameId, playerName) => {
    // If there's a game with one player waiting, join that game
    if (waitingGameId && games[waitingGameId].players.length < 2) {
        gameId = waitingGameId; // Join the waiting game
    } else if (!games[gameId]) {
        // If no game exists with this ID, create a new game
        games[gameId] = { players: [], names: [], deceiverActive: {}, ready: [false, false] };
        console.log('room created: ' + gameId);
    }

    // Add the player to the game
    if (games[gameId].players.length < 2) {
        games[gameId].players.push(socket.id);
        games[gameId].names.push(playerName);
        socket.join(gameId);
        socket.emit('roomNumber', gameId);

        const playerIndex = games[gameId].players.length - 1; // Adjusted index
        socket.emit('assignPlayerIndex', playerIndex);

        console.log('player joined room ' + gameId);

        if (games[gameId].players.length === 2) {
            io.to(gameId).emit('showConnection');
            io.to(games[gameId].players[0]).emit('opponentName', games[gameId].names[1]);
            io.to(games[gameId].players[1]).emit('opponentName', games[gameId].names[0]);

            console.log("Players connected. Let's start!");
            waitingGameId = null; // Reset the waiting game ID since the room is full
        } else {
            waitingGameId = gameId; // Mark this game as waiting for another player
        }
    }

    console.log(games[gameId]);
});


    socket.on('joinQueue', () => {
        if (waitingPlayer) {
          // If there is already a player waiting, pair them
          const opponent = waitingPlayer;
          waitingPlayer = null;
    
          const room = `room-${socket.id}-${opponent.id}`;
          socket.join(room);
          opponent.join(room);
    
          // Notify both players that the game has started
          io.to(room).emit('matchFound', room);
          console.log('room created ', room);
        } else {
          // If no player is waiting, this player waits
          waitingPlayer = socket;
        }
      });

      socket.on('useDeceiver', ({ gameId }) => {  
        if (games[gameId]) {
            const playerIndex = games[gameId].players.indexOf(socket.id);
            if (playerIndex !== -1) {
                games[gameId].deceiverActive[playerIndex] = true;
                io.to(gameId).emit('deceiverActivated', { playerId: socket.id });
                console.log(`Deceiver activated by player ${playerIndex} in game ${gameId}`);
            }
        }
    });

    socket.on('activateDeceiver', ({ gameId, opponentName }) => {
      const game = games[gameId];
      if (game) {
         
            console.log("send decieve to " + opponentName)
            // Notify the opponent that the deceiver has been activated
            io.emit('deceiverActivated', opponentName);
          
      }
  });
    
      socket.on('playerShot', ({ x, y, hit }) => {
const gameId = Object.keys(games).find(id => games[id].players.includes(socket.id));
const playerIndex = games[gameId].players.indexOf(socket.id);
const opponentId = games[gameId].players[1 - playerIndex];

if (games[gameId].deceiverActive[opponentId]) {
    // Handle misdirecting the shot
    games[gameId].deceiverActive[opponentId] = false;
}

        
        if (gameId) {
          const opponent = games[gameId].players.find(id => id !== socket.id);
          io.to(opponent).emit('opponentShot', { x, y, hit });
         
        }
      });

     

      socket.on('itemReveal', ({ x, y}) => {
        
        const gameId = Object.keys(games).find(id => games[id].players.includes(socket.id));
        
        if (gameId) {
          const opponent = games[gameId].players.find(id => id !== socket.id);
          console.log(opponent)
          io.to(opponent).emit('itemReveal', { x, y });
         
        }
      });

      socket.on('placeShip', ({ x, y, hit }) => {
        const gameId = Object.keys(games).find(id => games[id].players.includes(socket.id));
        if (gameId) {
          const opponent = games[gameId].players.find(id => id !== socket.id);
          io.to(opponent).emit('placeShip', { x, y });
          
        }
      });

      socket.on('readyShips', ({ gameId, playerIndex }) => {
        const game = games[gameId];
        if (game) {
            game.ready[playerIndex] = true;
           
            // Check if both players are ready
            if (games[gameId].ready.every(ready => ready)) {
              io.to(gameId).emit('startGame');
              console.log(`Game ${gameId} is starting!`);
          }
        }
    });

    socket.on('useRadarJammer', (updatedGrid) => {
      const gameId = Object.keys(games).find(id => games[id].players.includes(socket.id));
      if (gameId) {
          const opponent = games[gameId].players.find(id => id !== socket.id);
          if (opponent) {
              socket.to(opponent).emit('RadarJammer', updatedGrid); // Send the updated grid to the opponent
              console.log("Grid cleared for opponent");
          } else {
              console.log("Opponent not found in the game");
          }
      } else {
          console.log("Room not found");
      }
  });

    socket.on('disconnect', () => {
        console.log('A user disconnected: ', socket.id);
        for (let gameId in games) {
            games[gameId].players = games[gameId].players.filter(player => player !== socket.id);
            if (games[gameId].players.length === 0) {
                delete games[gameId];
            }
        }
    });
});

server.listen(3000, () => {
    console.log('Server is running on port 3000');
});
