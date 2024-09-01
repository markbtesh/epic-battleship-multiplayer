import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, PLATFORM_ID, OnInit, ApplicationRef,inject, ChangeDetectorRef   } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { first } from 'rxjs/operators';

@Component({
  selector: 'app-game-board',
  standalone: true,
  imports: [CommonModule], 
  templateUrl: './game-board.component.html',
  styleUrls: ['./game-board.component.css']
})



export class GameBoardComponent implements OnInit {
  gridSize: number = 8;
  playerGrid: string[][] = [];
  computerGrid: string[][] = [];
  isMultiplayer: boolean = false;
  gamemode: number = 0;
  playerShips: { x: number, y: number }[] = [];
  computerShips: { x: number, y: number }[] = [];
  itemCells: { x: number, y: number }[] = [];
  itemCellsPlayer: { x: number, y: number }[] = [];  // Track item cells
  itemImages: { [key: string]: string } = {
    'Mine Bomb': 'assets/images/item-bomb.png',
    'Radar Jammer': 'assets/images/item-radar.png',
    'Rocket Deceiver': 'assets/images/item-deciever.png',
    'Airstrike': 'assets/images/item-strike.png',
    'Homing Missile': 'assets/images/item-homing.png'
  };
  acquiredItems: string[] = [];  // List of items acquired by the player
  computerItems: string[] = [];  // List of items acquired by the computer
  gameMessage: string = 'Place your 5 ships!';
  isPlayerTurn: boolean = false;
  gameInProgress: boolean = false;
  enableBomb: boolean = false;
  enableAirstrike: boolean = false;
  enableHomingMissile: boolean = false;
  deceiverActive: boolean = false;
  enableComputerBomb: boolean = false;
  enableComputerAirstrike: boolean = false;
  enableComputerHomingMissile: boolean = false;
  deceiverComputerActive: boolean = false;
  gridBackgroundClass: string = 'default-grid';
  isShaking: boolean = false; // Controls the shaking effect
  socket!: Socket;
  room!: string;
  isConnected: boolean = false;
  roomNumber: string = '';
  showColors: boolean = true;
  playerName: string = '';
  opponentName: string = '';
  playerIndex: number | null = null;
  whosturn: string = "";

  // Method to handle when a ship gets hit
  handleHit(): void {
    this.triggerShakeEffect(); 
  }

  triggerShakeEffect(): void {
    this.isShaking = true; // Add the shaking class
    setTimeout(() => {
      this.isShaking = false; // Remove the shaking class after the animation ends
    }, 500); // Match the duration of the CSS animation (0.5s)
  }

  preloadedSounds: { [key: string]: HTMLAudioElement } = {}; 
  constructor(@Inject(PLATFORM_ID) private platformId: Object, private cdr: ChangeDetectorRef) {
    // Initialize socket with autoConnect set to false
    if (isPlatformBrowser(this.platformId)) {
      
      this.socket = io('https://epic-battleship-multiplayer-server-4x1lukrf7.vercel.app', {
        withCredentials: true
      });
      inject(ApplicationRef).isStable.pipe(
        first(isStable => isStable)
      ).subscribe(() => {
        this.socket.connect();
      });
    }
    // Wait until the application is stable before connecting the socket
   
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.initializeGrids();
      this.preloadSound('splash', 'assets/sounds/splash.mp3');
      this.preloadSound('explode', 'assets/sounds/explode.mp3');
      this.preloadSound('select', 'assets/sounds/select.mp3');
      this.preloadSound('ping', 'assets/sounds/ping.mp3');
      this.preloadSound('win', 'assets/sounds/win-trumpet.mp3');
      this.preloadSound('lose', 'assets/sounds/lose-trumpet.mp3');

      this.setupSocketListeners();

      this.socket.on('startGame', () => {
        console.log("LET THE GAMES BEGIN"); // Check if this is printed
        this.startGame();
        
      });
      this.socket.on('roomNumber', (roomNumber: string) => {
        this.roomNumber = roomNumber; // Store the room number
        this.cdr.detectChanges(); // Trigger change detection to update the view
        console.log(roomNumber)
      });

    

      this.socket.on('matchFound', (room: string) => {
        this.room = room;
        console.log('Match found, joined room:', room);
        this.isPlayerTurn = true; // or assign turn based on some logic
      });
    }
  }

  preloadSound(name: string, url: string): void {
    const audio = new Audio(url);
    audio.load();  // Preload the sound
    this.preloadedSounds[name] = audio;
  }

  playSound(name: string): void {
    const audio = this.preloadedSounds[name];
    if (audio) {
      audio.currentTime = 0; 
      audio.volume = 0.5; // Adjust volume as needed
      audio.play();
    }
  }

  initializeGrids(): void {
    this.playerGrid = Array(this.gridSize).fill(null).map(() => Array(this.gridSize).fill(''));
    this.computerGrid = Array(this.gridSize).fill(null).map(() => Array(this.gridSize).fill(''));

    
  }

  placeComputerShips(): void {
    while (this.computerShips.length < 5) {
      const x = Math.floor(Math.random() * this.gridSize);
      const y = Math.floor(Math.random() * this.gridSize);
      if (!this.computerShips.some(ship => ship.x === x && ship.y === y)) {
        this.computerShips.push({ x, y });
        this.computerGrid[x][y] = 'S'; // Label the cell as containing a ship
      }
    }
  }

  placeItemsOnGrid(): void {
    let itemCount = 0;
    while (itemCount < 8) {
      const x = Math.floor(Math.random() * this.gridSize);
      const y = Math.floor(Math.random() * this.gridSize);
      // Ensure item is placed in an empty cell (not a ship)
      if ((!this.computerShips.some(ship => ship.x === x && ship.y === y) && !this.playerShips.some(ship => ship.x === x && ship.y === y)) &&
          !this.itemCells.some(item => item.x === x && item.y === y)) {
        this.itemCells.push({ x, y });
        itemCount++;
      }
    }
  }

  placeItemsOnPlayerGrid(): void {
    let itemCount = 0;
    while (itemCount < 8) {
      const x = Math.floor(Math.random() * this.gridSize);
      const y = Math.floor(Math.random() * this.gridSize);
      // Ensure item is placed in an empty cell (not a ship)
      if (!this.playerShips.some(ship => ship.x === x && ship.y === y) &&
          !this.itemCellsPlayer.some(item => item.x === x && item.y === y)) {
        this.itemCellsPlayer.push({ x, y });
        itemCount++;
      }
    }
  }

  placePlayerShip(x: number, y: number): void {
    if (this.gameInProgress || this.playerShips.length >= 5 || this.gamemode == 0) {
      return;  // Prevent placing ships after the game starts
    }

    if (!this.playerShips.some(ship => ship.x === x && ship.y === y)) {
      this.playerShips.push({ x, y });
      this.playerGrid[x][y] = 'S';
      this.playSound('select');

      if (this.isMultiplayer) {
        this.socket.emit('placeShip', { x, y });
      }

      if (this.playerShips.length === 5) {
        if (this.isMultiplayer) {
          this.whosturn = "Waiting for opponent..."
        this.socket.emit('readyShips', { gameId: this.roomNumber, playerIndex: this.playerIndex });
        console.log("send to ready " + this.playerIndex);
        }
        if (!this.isMultiplayer) {
          this.startGame();
        }
        this.showColors = false;
      }
    }
  }

  startGame(): void {
    this.isPlayerTurn = true;
    this.gameInProgress = true;  // Mark the game as in progress
    this.placeItemsOnGrid();
    console.log("game started")
    this.gameMessage = 'Your turn! Fire at the enemy!';
    
    this.showColors = false;
    if (this.isMultiplayer) {
      this.whosturn = 'Your turn!';
      this.socket.emit('startGame');
    }
  }

  setupSocketListeners(): void {
    this.socket.on('connect', () => {
      console.log('Connected to the server');
    });

    this.socket.on('startGame', () => {
      console.log("LET THE GAMES BEGIN"); // Check if this is printed
      this.startGame();
      
    });

    this.socket.on('assignPlayerIndex', (index: number) => {
      this.playerIndex = index;
  });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from the server');
    });
    this.socket.on('placeShip', ({ x, y }) => {
      this.computerShips.push({ x, y });
      this.computerGrid[x][y] = 'S';
    });

    this.socket.on('showConnection', () => {
      this.isConnected = true;
      this.cdr.detectChanges(); 
    });

    this.socket.on('roomNumber', (roomNumber: string) => {
      this.roomNumber = roomNumber; // Store the room number
      this.cdr.detectChanges(); // Trigger change detection to update the view
      console.log(roomNumber)
    });
  
    this.socket.on('displayOpponentName', (name: string) => {
      this.opponentName = name;
     
      this.cdr.detectChanges(); 
    });

    this.socket.on('opponentShot', ({ x, y, hit }) => {

      let foundItem: boolean = this.playerGrid[x][y] === 'I'; // Check if the cell contains an item

if (foundItem) {
    
    // You can update the grid to show that the item was found, e.g.:
    this.playerGrid[x][y] = 'I'; // Optionally keep 'I' if you want to keep it visible
} else {
    hit = this.playerGrid[x][y] === 'S'; // Check if it's a ship
    console.log("opponent hit")
    this.playerGrid[x][y] = hit ? 'X' : 'O'; // Mark the cell accordingly
    this.gameMessage = hit ? 'Your ship was hit!' : 'Opponent missed!';
}   this.whosturn = "Your turn!"
      this.isPlayerTurn = true;

      if (hit) {
        this.playerShips = this.playerShips.filter(ship => !(ship.x === x && ship.y === y));
        if (this.playerShips.length === 0) {
          this.gameMessage = 'You lost!';
          this.whosturn = '';
          this.gameInProgress = false;
        }
      }
    });


    this.socket.on('deceiverActivated', (targetName: string) => {
      // Check if the deceiver was activated by the opponent
      if (this.playerName == targetName) {
         this.deceiverComputerActive = true;
       
         this.cdr.detectChanges();
      }
    });

    this.socket.on('itemReveal', ({ x, y}) => {
        this.playerGrid[x][y] = 'I';
        console.log(this.playerGrid[x][y])
    });

    this.socket.on('opponentName', (name: string) => {
      this.opponentName = name;
      console.log('Opponent name received:', name);
      this.cdr.detectChanges(); 
  });

  this.socket.on('RadarJammer', () => {
    
    this.useRadarJammer(this.computerGrid, false); // Update the opponent's grid
    this.cdr.detectChanges(); // Trigger change detection to update the view
});
    this.socket.on('fire', ({ x, y }) => {
      const hit = this.playerGrid[x][y] === 'S';
      this.playerGrid[x][y] = hit ? 'X' : 'O';
      this.gameMessage = hit ? 'Opponent hit your ship!' : 'Opponent missed!';
      this.isPlayerTurn = true;

      if (hit) {
        this.playerShips = this.playerShips.filter(ship => !(ship.x === x && ship.y === y));
        this.playSound('explode');
        this.triggerShakeEffect();

        if (this.playerShips.length === 0) {
          this.gameMessage = 'Opponent wins!';
          this.playSound('lose');
          this.gameInProgress = false;
        }
      }
    });
  }



  fireAtComputer(x: number, y: number): void {
    if (this.isPlayerTurn && this.computerGrid[x][y] !== "O" && this.computerGrid[x][y] !== "X" && this.gameInProgress) {
      const currentCell = this.computerGrid[x][y];

      // Check if the cell contains a ship ('S')
      const hit = currentCell === 'S';

      if (this.deceiverComputerActive) {
        const adjacentCells = this.getAdjacentCells(x, y);
  
        // Filter out already hit cells (marked as 'X' or 'O')
        const validAdjacentCells = adjacentCells.filter(cell =>
          this.computerGrid[cell.x] && this.computerGrid[cell.x][cell.y] !== 'X' && this.computerGrid[cell.x][cell.y] !== 'O'
        );
  
        if (validAdjacentCells.length > 0) {
          // Randomly select one of the valid adjacent cells
          const randomCell = validAdjacentCells[Math.floor(Math.random() * validAdjacentCells.length)];
          x = randomCell.x;
          y = randomCell.y;
        }
      
        // Reset the Rocket Deceiver flag
        this.deceiverComputerActive = false;
      } 

      const item = this.itemCells.some(item => item.x === x && item.y === y);

      if (this.computerGrid[x][y] == 'I') {
        return;
      } 

      if (!this.enableHomingMissile)
      this.computerGrid[x][y] = hit ? 'X' : 'O';

      this.gameMessage = hit ? 'Hit!' :  'Miss!';
      if(this.isMultiplayer)
      this.whosturn = this.opponentName + "'s turn";
       
      if (item) {
        this.acquireRandomItem(true);
        this.computerGrid[x][y] = 'I';
        if(this.isMultiplayer)
        this.socket.emit('itemReveal', { x, y });
        this.itemCells = this.itemCells.filter(item => !(item.x === x && item.y === y));
        
        
      }
      
      if (hit && !this.enableHomingMissile) {
        this.computerShips = this.computerShips.filter(ship => !(ship.x === x && ship.y === y));
        this.playSound('explode');
        this.triggerShakeEffect(); 
        if (this.computerShips.length === 0) {
          this.gameMessage = 'You win!';
          this.gameInProgress = false;
          this.playSound('win');
          return;
        }
      } else {
        this.playSound('splash');
      }

      if (this.enableBomb) {
        this.useMineBomb(x, y, this.computerGrid, this.computerShips, true);
        this.enableBomb = false;
      }
      if (this.enableAirstrike) {
        this.useAirstrike(x, y, this.computerGrid, this.computerShips, true);
        this.enableAirstrike = false;
      }
      if (this.enableHomingMissile) {
        this.useHomingMissile(x, y,  this.computerGrid, this.computerShips);

        this.enableHomingMissile = false;
      }
      if (this.isMultiplayer) {
        this.socket.emit('playerShot', { x, y, hit });
        this.isPlayerTurn = false;
      }
      else {
        setTimeout(() => this.computerMove(), 1000);
      }

     
      console.log(this.gameMessage);
      
    }
  }

  computerMove(): void {
    let x: number, y: number;
  
    // Choose a target
    do {
      x = Math.floor(Math.random() * this.gridSize);
      y = Math.floor(Math.random() * this.gridSize);
    } while (this.playerGrid[x][y] === 'X' || this.playerGrid[x][y] === 'O');
  
  
    // If Rocket Deceiver is active, misdirect the hit
    if (this.gameInProgress) {
      const hit = this.playerShips.some(ship => ship.x === x && ship.y === y);

      if (this.deceiverActive) {
        const adjacentCells = this.getAdjacentCells(x, y);
  
        // Filter out already hit cells (marked as 'X' or 'O')
        const validAdjacentCells = adjacentCells.filter(cell =>
          this.playerGrid[cell.x] && this.playerGrid[cell.x][cell.y] !== 'X' && this.playerGrid[cell.x][cell.y] !== 'O'
        );
  
        if (validAdjacentCells.length > 0) {
          // Randomly select one of the valid adjacent cells
          const randomCell = validAdjacentCells[Math.floor(Math.random() * validAdjacentCells.length)];
          x = randomCell.x;
          y = randomCell.y;
        }
      
        // Reset the Rocket Deceiver flag
        this.deceiverActive = false;
      } 
  
      // Check for items on the player's grid
      const item = this.itemCells.some(item => item.x === x && item.y === y);
  

      if (this.computerGrid[x][y] == 'I') {
        return;
      } 

      // Proceed with the hit
      this.playerGrid[x][y] = hit ? 'X' : 'O';
      this.gameMessage = hit ? 'Computer hit your ship!' : 'Computer missed!';
  
      if (hit && !this.enableComputerHomingMissile) {
        this.playerShips = this.playerShips.filter(ship => !(ship.x === x && ship.y === y));
        this.playSound('explode');
        this.triggerShakeEffect(); 
        if (this.playerShips.length === 0) {
          this.gameMessage = 'Computer wins!';
          this.playSound('lose');
          this.gameInProgress = false;
          return;
        }
      }
      
   
      if (item) {
        this.acquireRandomItem(false);
        this.playerGrid[x][y] = 'I';
        this.itemCellsPlayer = this.itemCellsPlayer.filter(item => !(item.x === x && item.y === y));
      }
  
      // If the computer has items, it can use them
      if (this.computerItems.length > 0) {
        const itemToUse = this.computerItems[0]; // Use the first acquired item
        this.useComputerItem(itemToUse);
      }

      if (this.enableComputerBomb) {
        this.useMineBomb(x, y, this.playerGrid, this.playerShips, true);
        this.enableComputerBomb = false;
      }
      if (this.enableComputerAirstrike) {
        this.useAirstrike(x, y, this.playerGrid, this.playerShips, true);
        this.enableComputerAirstrike = false;
      }
      if (this.enableComputerHomingMissile) {
        this.useHomingMissile(x, y, this.playerGrid, this.playerShips);
        this.enableComputerHomingMissile = false;
      }
    }
    console.log(this.gameMessage);
    this.isPlayerTurn = true;
  }
  
  getAdjacentCells(x: number, y: number): { x: number, y: number }[] {
    const adjacentCells = [
      { x: x - 1, y: y }, // Left
      { x: x + 1, y: y }, // Right
      { x: x, y: y - 1 }, // Up
      { x: x, y: y + 1 }, // Down
    ];
  
    // Filter out cells that are outside the grid
    return adjacentCells.filter(cell =>
      cell.x >= 0 && cell.x < this.gridSize && cell.y >= 0 && cell.y < this.gridSize
    );
  }

  acquireRandomItem(forPlayer: boolean): void {
    const items = [ 'Mine Bomb', 'Radar Jammer', 'Rocket Deceiver', 'Airstrike', 'Homing Missile']; 
    const randomItem = items[Math.floor(Math.random() * items.length)];

    if (forPlayer) {
      if (this.acquiredItems.length < 3) {
        this.acquiredItems.push(randomItem);
        this.gameMessage = `You acquired a ${randomItem}!`;
        this.playSound('ping');
      }
    } else {
      if (this.computerItems.length < 3) {
        this.computerItems.push(randomItem);
        this.gameMessage = `Opponent acquired an item! ${randomItem}`;
      }
    }
  }

  useItem(item: string): void {
    const itemIndex = this.acquiredItems.indexOf(item);
  
    switch(item) {
      case 'Mine Bomb':
        this.enableBomb = true;
        break;
      case 'Radar Jammer':
        this.useRadarJammer(this.playerGrid, true);
        break;
      case 'Rocket Deceiver':
        this.useRocketDeceiver(this.deceiverActive);
        break;
      case 'Airstrike':
        this.enableAirstrike = true;
        break;
      case 'Homing Missile':
        this.enableHomingMissile = true;
        break;
    }
    this.playSound('select');
    this.gameMessage = `Using ${item}!`;

    // Remove item after use
    if (itemIndex !== -1) {
      this.acquiredItems.splice(itemIndex, 1);
    }
  }

  useComputerItem(item: string): void {
    const itemIndex = this.computerItems.indexOf(item);
  
    switch(item) {
      case 'Mine Bomb':
        this.enableComputerBomb = true;
        break;
      case 'Radar Jammer':
        this.useRadarJammer(this.computerGrid, true);
        break;
      case 'Rocket Deceiver':
        this.useRocketDeceiver(this.deceiverComputerActive);
        break;
      case 'Airstrike':
        this.enableComputerAirstrike = true;
        break;
      case 'Homing Missile':
        this.enableComputerHomingMissile = true;
        break;
    }
    this.gameMessage = `Computer is using ${item}!`;

    // Remove item after use
    if (itemIndex !== -1) {
      this.computerItems.splice(itemIndex, 1);
    }
  }
  

  useMineBomb(x: number, y: number, targetGrid: string[][], targetShips: { x: number, y: number }[], isPlayerUsing: boolean): void {
    const adjacentCells = [
      { x: x - 1, y: y }, { x: x + 1, y: y }, // Left and right
      { x: x, y: y - 1 }, { x: x, y: y + 1 } // Top and bottom
    ];
  
    adjacentCells.forEach(cell => {
      if (cell.x >= 0 && cell.x < this.gridSize && cell.y >= 0 && cell.y < this.gridSize) {
        
        if (targetGrid[cell.x][cell.y] === '') {
          targetGrid[cell.x][cell.y] = 'O'; // Mark as miss
          if (this.isMultiplayer) 
          if (isPlayerUsing) {
            this.socket.emit('playerShot', { x: cell.x, y: cell.y, hit: false });
          }
        } else if (targetGrid[cell.x][cell.y] === 'S') {
          const index = targetShips.findIndex(ship => ship.x === cell.x && ship.y === cell.y);
          if (index !== -1) targetShips.splice(index, 1); // Remove the ship from the targetShips array
          targetGrid[cell.x][cell.y] = 'X'; // Mark as hit
          if (this.isMultiplayer) 
          if (isPlayerUsing) {
            this.socket.emit('playerShot', { x: cell.x, y: cell.y, hit: true });
          }
  
          this.playSound('explode');
          this.triggerShakeEffect(); 
  
          if (targetShips.length === 0) {
            this.gameMessage = targetGrid === this.computerGrid ? 'You win!' : 'Opponent wins!';
            this.playSound(targetGrid === this.computerGrid ? 'win' : 'lose');
            this.gameInProgress = false;
            return;
          }
        }
      }
    });
  
    if (isPlayerUsing) {
      this.isPlayerTurn = false;
      // Notify the server that the player has completed their turn
      this.socket.emit('endTurn');
    }
  }
  


useAirstrike(x: number, y: number, targetGrid: string[][], targetShips: { x: number, y: number }[], isPlayerUsing: boolean): void {
  const adjacentCells = [
    { x: x , y: y - 1}, { x: x , y: y + 1}, // Left and right
    { x: x , y: y - 2}, { x: x , y: y + 2}, 
    { x: x , y: y - 3}, { x: x , y: y + 3}, 
    { x: x , y: y - 4}, { x: x , y: y + 4}, 
    { x: x , y: y - 5}, { x: x , y: y + 5}, 
    { x: x , y: y - 6}, { x: x , y: y + 6}, 
    { x: x , y: y - 7}, { x: x , y: y + 7}
  ];

  adjacentCells.forEach(cell => {
    if (cell.x >= 0 && cell.x < this.gridSize && cell.y >= 0 && cell.y < this.gridSize) {
      if (targetGrid[cell.x][cell.y] === '') {
        targetGrid[cell.x][cell.y] = 'O'; // Miss
        if (this.isMultiplayer) 
        if (isPlayerUsing) {
          this.socket.emit('playerShot', { x: cell.x, y: cell.y, hit: false });
        }
      } else if (targetGrid[cell.x][cell.y] === 'S') {
        const index = targetShips.findIndex(ship => ship.x === cell.x && ship.y === cell.y);
        if (index !== -1) targetShips.splice(index, 1); // Remove the ship from the targetShips array
        targetGrid[cell.x][cell.y] = 'X'; // Hit
        if (this.isMultiplayer) 
        if (isPlayerUsing) {
          this.socket.emit('playerShot', { x: cell.x, y: cell.y, hit: true });
        }
        this.playSound('explode');
        this.triggerShakeEffect(); 
        if (targetShips.length === 0) {
          this.gameMessage = targetGrid === this.computerGrid ? 'You win!' : 'Computer wins!';
          this.playSound(targetGrid === this.computerGrid ? 'win' : 'lose');
          this.gameInProgress = false;
          return;
        }
      }
    }
  });
  if(this.isMultiplayer)
  if (isPlayerUsing) {
    this.isPlayerTurn = false;
    // Notify the server that the player has completed their turn
    this.socket.emit('endTurn');
  }
}

useHomingMissile(x: number, y: number, targetGrid: string[][], targetShips: { x: number, y: number }[]): void {
  const adjacentCells = [
    { x: x - 1, y: y }, { x: x + 1, y: y }, 
    { x: x - 1, y: y - 1}, { x: x + 1, y: y + 1},
    { x: x - 1, y: y + 1}, { x: x + 1, y: y - 1},  // Left and right
    { x: x, y: y - 1 }, { x: x, y: y + 1 },
    { x: x - 1, y: y - 1 }, { x: x + 1, y: y + 1 }, 
    { x: x + 1, y: y - 1 }, { x: x - 1, y: y + 1 } 
  ];

  for (let cell of adjacentCells) {
    if (cell.x >= 0 && cell.x < this.gridSize && cell.y >= 0 && cell.y < this.gridSize) {
      if (targetGrid[cell.x][cell.y] === 'S') {
        targetGrid[cell.x][cell.y] = 'X'; // Mark as hit
        if (this.isMultiplayer) 
        this.socket.emit('playerShot', { x: cell.x, y: cell.y, hit: true });
        
        this.playSound('explode');
        this.triggerShakeEffect(); 
        this.gameMessage = 'Hit!';
        const index = targetShips.findIndex(ship => ship.x === cell.x && ship.y === cell.y);
        if (index !== -1) targetShips.splice(index, 1); // Remove the ship from the targetShips array

        if (targetShips.length === 0) {
          this.gameMessage = targetGrid === this.computerGrid ? 'You win!' : 'Computer wins!';
          this.playSound(targetGrid === this.computerGrid ? 'win' : 'lose');
          this.gameInProgress = false;
          return;
        }

        // Stop the loop after hitting one ship
        break;
      } else {
        targetGrid[x][y] =  'O';
      }
    }
  }
}


useRadarJammer(targetGrid: string[][], isInitiator: boolean): void {
  for (let x = 0; x < this.gridSize; x++) {
      for (let y = 0; y < this.gridSize; y++) {
          if (targetGrid[x][y] === 'O') {
              targetGrid[x][y] = ''; // Clear missed cells
          }
      }
  }
  if (this.isMultiplayer)
  if (isInitiator) {
      this.socket.emit('useRadarJammer', targetGrid);
  }
  this.gameMessage = targetGrid === this.computerGrid ? 'Opponent used Radar Jammer' : 'Your missed cells have been cleared!';
  this.playSound("ping");
}


  useRocketDeceiver(deceiver: boolean): void {
    if (this.isMultiplayer) {
      this.socket.emit('activateDeceiver', { gameId: this.roomNumber, opponentName: this.opponentName });
         // Notify the server
    } else {
      this.deceiverActive = true; // Single player mode
    }
    this.gameMessage = 'Rocket Deceiver activated! The opponent\'s next hit will be misdirected!';
  }

  

  

  changeGridBackground(newClass: string): void {
    this.gridBackgroundClass = newClass; // Update the grid background class
    this.playSound('select');
  }
  
  isItemCell(x: number, y: number): boolean {
    return this.itemCells.some(item => item.x === x && item.y === y);
  }

  isEnemyCell(x: number, y: number): boolean {
    return this.computerShips.some(item => item.x === x && item.y === y);
  }

  hasHitShips(): boolean {
    const playerShipsHit = this.computerShips.some(ship => this.computerGrid[ship.x][ship.y] === 'O');
    const computerShipsHit = this.computerShips.some(ship => this.computerGrid[ship.x][ship.y] === 'S');
    
    return computerShipsHit;
  }

  startSinglePlayer(): void {
    this.placeComputerShips();
    this.gamemode = 1;
  }
  
  startMultiplayer(): void {
    const enteredName = prompt('Enter your name');
    this.playerName = enteredName !== null ? enteredName : 'Player';
  if (!enteredName) {
    alert('Name is required to start the game.');
    return;
  }
    const gameId = prompt('Enter game ID or leave blank to create a new game:');
    this.joinGame(gameId || Math.random().toString(36).substring(7), this.playerName);
    this.isMultiplayer = true;
    this.gamemode = 2;
    
  }

  joinGame(gameId: string, name: string): void {
    this.socket.emit('joinGame', gameId, name);
  }  

}

