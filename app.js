var app = angular.module("app", []);
app.controller(
  "HomeCtrl",
  function ($scope, $http, $filter, $rootScope, $window, $timeout) {
    console.log("Testing");
    $scope.msg2 = "";
    $scope.msg = ""; // Initialize empty
    $scope.crossLnHit = false;
    $scope.doubleLine = false;
    $scope.warn_msg = "";

    // Form data initialization
    $scope.formData = {
      name: "",
      phone: "",
      vehicleNumber: "",
      language: "en",
      termsAccepted: false
    };

    // Music selection
    $scope.selectedMusic = null;
    $scope.selectMusic = function(musicId) {
      $scope.selectedMusic = musicId;
      console.log("Selected music:", musicId);
    };

    const canvas = document.getElementById("gameCanvas");
    canvas.style.touchAction = "none";
    const ctx = canvas.getContext("2d");

    let gameRunning = true;
    let score = 0;
    let game_speed = 2;
    const gameOverModal = document.getElementById("gameOverModal");
    const finalScoreEl = document.getElementById("finalScore");
    const tryAgainBtn = document.getElementById("tryAgainBtn");

    let fuel = 100;
    const fuelDecreaseRate = 0.1;
    const fuelBar = document.getElementById("fuelBar");
    let lowFuelWarning = false;

    // Game timer (60 seconds)
    let gameTimer = 60;
    let timerInterval = null;

    // Marks system
    let marks = 0;
    let showGoldenAnimation = false;
    let goldenAnimationTimer = 0;
    let showRedAnimation = false;
    let redAnimationTimer = 0;

    // Notification queue system to prevent overlapping modals
    let notificationQueue = [];
    let isShowingNotification = false;
    let currentNotificationType = null;

    // Top notification system (non-blocking)
    function showTopNotification(type, message, imagePath = null, duration = 2000) {
      const topNotification = document.getElementById('topNotification');
      const notificationText = document.getElementById('notificationText');
      const notificationImage = document.getElementById('notificationImage');

      if (!topNotification || !notificationText) return;

      // Set message
      notificationText.textContent = message;

      // Set image if provided
      if (imagePath && notificationImage) {
        notificationImage.src = imagePath;
        notificationImage.style.display = 'block';
      } else if (notificationImage) {
        notificationImage.style.display = 'none';
      }

      // Set type class
      topNotification.classList.remove('genuine', 'non-genuine');
      topNotification.classList.add(type);

      // Show notification
      topNotification.classList.add('show');

      // Auto hide after duration
      setTimeout(() => {
        topNotification.classList.remove('show');
      }, duration);
    }

    const lineSpacing = 140;
    const lineHeight = 120;
    let offset = 0;

    let doubleLineActive = false;
    let doubleLineTimer = 0;
    let doubleLineLogged = false;
    let barrierCooldown = 0;
    let yellowLinePaused = false;
    let inSafeRange = false;
    let yellowLineSpawned = false;

    var sindu = null; // Will be initialized based on music selection
    var tuk_sound = new Audio("./audio/tuk_sound.mp3");

    // Initialize music based on selection
    function initializeMusic() {
      if ($scope.selectedMusic === 0) {
        // No music selected
        sindu = null;
        return;
      } else if ($scope.selectedMusic >= 1 && $scope.selectedMusic <= 5) {
        // Load selected song
        sindu = new Audio(`song/${$scope.selectedMusic}.mp3`);
      } else {
        // Fallback to no music if nothing selected
        sindu = null;
      }
    }

    // Helper functions for music playback
    function playMusic() {
      if (sindu) {
        sindu.play();
      }
    }

    function pauseMusic() {
      if (sindu) {
        sindu.pause();
      }
    }

    const items = [];

    // Genuine spare parts (correct items - add marks)
    const genuinePartsPaths = [
      "./genuine/part1.jpeg",
      "./genuine/part2.jpeg",
      // "./genuine/part3.jpeg",
      // "./genuine/part4.jpeg",
      // "./genuine/part5.jpeg"
    ];

    // Non-genuine spare parts (incorrect items - decrease marks)
    const nonGenuinePartsPaths = [
      "./nongenuine/part1.jpeg",
      "./nongenuine/part2.png",
      // "./nongenuine/part3.png",
      // "./nongenuine/part4.png",
      // "./nongenuine/part5.png"
    ];

    // Load genuine parts images
    const genuinePartsImages = [];
    genuinePartsPaths.forEach(path => {
      const img = new Image();
      img.src = path;
      genuinePartsImages.push(img);
    });

    // Load non-genuine parts images
    const nonGenuinePartsImages = [];
    nonGenuinePartsPaths.forEach(path => {
      const img = new Image();
      img.src = path;
      nonGenuinePartsImages.push(img);
    });

    const itemTypes = ["barrier", "fuel", "genuine", "nongenuine"];
    const spawnInterval = 1500;
    const itemImages = {
      barrier: new Image(),
      fuel: new Image(),
    };
    const tukImg = new Image();
    const tuk = {
      lane: "left",
      targetLane: "left", // For smooth transitions
      y: 0,
      x: 0,
      targetX: 0, // For smooth transitions
      width: 200, // Increased from 160 for better visibility
      height: 350, // Increased from 280 for better visibility
      transitionSpeed: 0.15 // Smooth transition factor (0-1, higher = faster)
    };

    const treeImages = [];
    for (let i = 1; i <= 7; i++) {
      const treeImg = new Image();
      treeImg.src = `images/trees/t${i}.gif`;
      treeImages.push(treeImg);
    }

    const trees = [];
    const treeSpawnRate = 0.05;

    // Load house images
    const houseImages = [];
    for (let i = 1; i <= 4; i++) {
      const houseImg = new Image();
      houseImg.src = `images/houses/h${i}.png`;
      houseImages.push(houseImg);
    }

    const houses = [];
    const houseSpawnRate = 0.005; // Spawn much less frequently than trees

    function initializeHouses() {
      // Initialize 2 houses on left side
      for (let i = 0; i < 2; i++) {
        houses.push({
          type: Math.floor(Math.random() * 4), // 4 house images (h1-h4)
          x: Math.random() * (canvas.width * 0.25),
          y: 480 + Math.random() * 200,
          initialY: 480 + Math.random() * 200,
          initialX: 0,
          speed: 0.3 + Math.random() * 0.4,
          size: 50 + Math.random() * 25, // Start with smaller base size
          side: "left",
        });
        houses[houses.length - 1].initialX = houses[houses.length - 1].x;
      }

      // Initialize 2 houses on right side
      for (let i = 0; i < 2; i++) {
        houses.push({
          type: Math.floor(Math.random() * 4),
          x: canvas.width * 0.75 + Math.random() * (canvas.width * 0.25),
          y: 480 + Math.random() * 200,
          initialY: 480 + Math.random() * 200,
          initialX: 0,
          speed: 0.3 + Math.random() * 0.4,
          size: 50 + Math.random() * 25,
          side: "right",
        });
        houses[houses.length - 1].initialX = houses[houses.length - 1].x;
      }
    }

    function spawnNewHouse(side) {
      const newHouse = {
        type: Math.floor(Math.random() * 4),
        y: 480 + Math.random() * 30, // Spawn closer to road top
        initialY: 480 + Math.random() * 30,
        speed: 0.3 + Math.random() * 0.4,
        size: 50 + Math.random() * 25, // Start with smaller base size
        side: side,
      };

      if (side === "left") {
        newHouse.x = Math.random() * (canvas.width * 0.25);
        newHouse.initialX = newHouse.x;
      } else {
        newHouse.x = canvas.width * 0.75 + Math.random() * (canvas.width * 0.25);
        newHouse.initialX = newHouse.x;
      }

      houses.push(newHouse);
    }

    function updateHouses() {
      if (!gameRunning || paused) return;

      const roadTopY = 500;
      const roadBottomY = canvas.height;
      const roadTopWidth = canvas.width * 0.4;
      const roadBottomWidth = canvas.width;

      for (let i = houses.length - 1; i >= 0; i--) {
        const house = houses[i];

        house.y += game_speed * house.speed;

        // Calculate position ratio from top to bottom (0 to 1)
        const t = Math.max(0, (house.y - roadTopY) / (roadBottomY - roadTopY));
        const roadWidthAtY =
          roadTopWidth + (roadBottomWidth - roadTopWidth) * t;

        const centerX = canvas.width / 2;
        const leftRoadEdge = centerX - roadWidthAtY / 2;
        const rightRoadEdge = centerX + roadWidthAtY / 2;

        // Smooth scaling: houses grow from 1x at top to 5x at bottom
        const scaleIncrease = 1 + t * 4;
        house.currentSize = house.size * scaleIncrease;

        const awayOffset = 30 + t * 80 + scaleIncrease * 15;

        if (house.side === "left") {
          const roadAngleOffset =
            (leftRoadEdge - (canvas.width / 2 - roadTopWidth / 2)) * t;
          house.x = house.initialX + roadAngleOffset - awayOffset;
        } else {
          const roadAngleOffset =
            (rightRoadEdge - (canvas.width / 2 + roadTopWidth / 2)) * t;
          house.x = house.initialX + roadAngleOffset + awayOffset;
        }

        if (
          house.y > canvas.height + 100 ||
          house.x < -200 ||
          house.x > canvas.width + 200
        ) {
          houses.splice(i, 1);
        }
      }

      if (Math.random() < houseSpawnRate * (game_speed / 20)) {
        if (Math.random() < 0.5) {
          spawnNewHouse("left");
        } else {
          spawnNewHouse("right");
        }
      }
    }

    function drawHouses() {
      const sortedHouses = [...houses].sort((a, b) => a.y - b.y);

      sortedHouses.forEach((house) => {
        if (house.y > 400) { // Start showing houses earlier to reach closer to road
          const houseImg = houseImages[house.type];
          if (houseImg && houseImg.complete) {
            const size = house.currentSize || house.size;
            const alpha = Math.min(1, (house.y - 400) / 100); // Fade in earlier

            // Draw 3D shadow for houses
            ctx.globalAlpha = alpha * 0.4;
            ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
            ctx.shadowBlur = 15 + (size / 10);
            ctx.shadowOffsetX = 8;
            ctx.shadowOffsetY = 8;

            // Draw house shadow (ground ellipse)
            ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
            ctx.beginPath();
            ctx.ellipse(
              house.x,
              house.y + size / 3,
              size / 3,
              size / 8,
              0, 0, Math.PI * 2
            );
            ctx.fill();

            // Draw house with depth
            ctx.globalAlpha = alpha * 0.9;
            ctx.drawImage(
              houseImg,
              house.x - size / 2,
              house.y - size / 2,
              size,
              size
            );

            // Reset
            ctx.globalAlpha = 1;
            ctx.shadowColor = "transparent";
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
          }
        }
      });
    }

    let paused = false;
    $scope.pause = false;
    let yellowLine = null;
    const walkImg = new Image();
    walkImg.src = "./side_walk-remove.png";
    walkImg.onload = () => console.log("Sidewalk image loaded successfully");
    walkImg.onerror = () =>
      console.error("Failed to load sidewalk image: ./side_walk-remove.png");

    function initializeTrees() {
      for (let i = 0; i < 3; i++) {
        trees.push({
          type: Math.floor(Math.random() * 3),
          x: Math.random() * (canvas.width * 0.25),
          y: 450 + Math.random() * 100,
          initialY: 450 + Math.random() * 100,
          initialX: 0,
          speed: 0.3 + Math.random() * 0.4,
          size: 60 + Math.random() * 30,
          side: "left",
        });
        trees[trees.length - 1].initialX = trees[trees.length - 1].x;
      }

      for (let i = 0; i < 3; i++) {
        trees.push({
          type: Math.floor(Math.random() * 3),
          x: canvas.width * 0.75 + Math.random() * (canvas.width * 0.25),
          y: 450 + Math.random() * 100,
          initialY: 450 + Math.random() * 100,
          initialX: 0,
          speed: 0.3 + Math.random() * 0.4,
          size: 60 + Math.random() * 30,
          side: "right",
        });
        trees[trees.length - 1].initialX = trees[trees.length - 1].x;
      }
    }

    function spawnNewTree(side) {
      const newTree = {
        type: Math.floor(Math.random() * 3),
        y: 400 + Math.random() * 50, // Spawn near horizon
        initialY: 400 + Math.random() * 50,
        speed: 0.3 + Math.random() * 0.4,
        size: 60 + Math.random() * 30,
        side: side,
      };

      if (side === "left") {
        newTree.x = Math.random() * (canvas.width * 0.25);
        newTree.initialX = newTree.x;
      } else {
        newTree.x = canvas.width * 0.75 + Math.random() * (canvas.width * 0.25);
        newTree.initialX = newTree.x;
      }

      trees.push(newTree);
    }

    function updateTrees() {
      if (!gameRunning || paused) return;

      const roadTopY = 500;
      const roadBottomY = canvas.height;
      const roadTopWidth = canvas.width * 0.4;
      const roadBottomWidth = canvas.width;

      for (let i = trees.length - 1; i >= 0; i--) {
        const tree = trees[i];

        tree.y += game_speed * tree.speed;

        const t = Math.max(0, (tree.y - roadTopY) / (roadBottomY - roadTopY));
        const roadWidthAtY =
          roadTopWidth + (roadBottomWidth - roadTopWidth) * t;

        const centerX = canvas.width / 2;
        const leftRoadEdge = centerX - roadWidthAtY / 2;
        const rightRoadEdge = centerX + roadWidthAtY / 2;

        const scaleIncrease = 1 + t * 8;
        tree.currentSize = tree.size * scaleIncrease;

        const awayOffset = 30 + t * 80 + scaleIncrease * 15;

        if (tree.side === "left") {
          const roadAngleOffset =
            (leftRoadEdge - (canvas.width / 2 - roadTopWidth / 2)) * t;
          tree.x = tree.initialX + roadAngleOffset - awayOffset;
        } else {
          const roadAngleOffset =
            (rightRoadEdge - (canvas.width / 2 + roadTopWidth / 2)) * t;
          tree.x = tree.initialX + roadAngleOffset + awayOffset;
        }

        if (
          tree.y > canvas.height + 100 ||
          tree.x < -200 ||
          tree.x > canvas.width + 200
        ) {
          trees.splice(i, 1);
        }
      }

      if (Math.random() < treeSpawnRate * (game_speed / 20)) {
        if (Math.random() < 0.5) {
          spawnNewTree("left");
        } else {
          spawnNewTree("right");
        }
      }
    }

    function drawTrees() {
      const sortedTrees = [...trees].sort((a, b) => a.y - b.y);

      sortedTrees.forEach((tree) => {
        if (tree.y > 450) { // Start showing trees near road top
          const treeImg = treeImages[tree.type];
          if (treeImg && treeImg.complete) {
            const size = tree.currentSize || tree.size;
            const alpha = Math.min(1, (tree.y - 450) / 100); // Fade in from road top

            // Draw 3D shadow for trees
            ctx.globalAlpha = alpha * 0.4;
            ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
            ctx.shadowBlur = 15 + (size / 10);
            ctx.shadowOffsetX = 8;
            ctx.shadowOffsetY = 8;

            // Draw tree shadow
            ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
            ctx.beginPath();
            ctx.ellipse(
              tree.x,
              tree.y + size / 3,
              size / 3,
              size / 8,
              0, 0, Math.PI * 2
            );
            ctx.fill();

            // Draw tree with depth
            ctx.globalAlpha = alpha * 0.9;
            ctx.drawImage(
              treeImg,
              tree.x - size / 2,
              tree.y - size / 2,
              size,
              size
            );

            // Reset
            ctx.globalAlpha = 1;
            ctx.shadowColor = "transparent";
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
          }
        }
      });
    }

    itemImages.barrier.src = "./barrier.png";
    itemImages.fuel.src = "./fuel.png";

    tukImg.src = "./center-tuk.png";

    function updateBars() {
      fuelBar.style.width = fuel + "%";
    }

    function getLaneX(y, lane) {
      const roadTopY = 500;
      const roadBottomY = canvas.height;
      const roadTopWidth = canvas.width * 0.4;
      const roadBottomWidth = canvas.width;

      const t = (y - roadTopY) / (roadBottomY - roadTopY);
      const roadWidthAtY = roadTopWidth + (roadBottomWidth - roadTopWidth) * t;

      const centerX = canvas.width / 2;
      const laneOffset = roadWidthAtY * 0.25;

      if (lane === "left") return centerX - laneOffset;
      if (lane === "right") return centerX + laneOffset;
      return centerX;
    }

    setInterval(() => {
      if (!gameRunning || paused) return;

      const lane = Math.random() < 0.5 ? "left" : "right";
      const startY = 450; // Spawn slightly before road top for smooth appearance

      const minDistance = 100;
      const hasOverlap = items.some(
        (item) =>
          item.lane === lane &&
          Math.abs(item.y - startY) < minDistance
      );

      if (hasOverlap) {
        console.log("Skipped item spawn due to overlap in lane:", lane);
        return;
      }

      let type;
      let partIndex = 0;

      if (fuel < 30 && !lowFuelWarning) {
        type = "fuel";
      } else {
        const availableTypes = doubleLineActive || barrierCooldown > 0
          ? itemTypes.filter(t => t !== "barrier")
          : itemTypes;
        type = availableTypes[Math.floor(Math.random() * availableTypes.length)];

        // If it's a genuine or non-genuine part, pick a random image
        if (type === "genuine") {
          partIndex = Math.floor(Math.random() * genuinePartsImages.length);
        } else if (type === "nongenuine") {
          partIndex = Math.floor(Math.random() * nonGenuinePartsImages.length);
        }
      }

      const x = getLaneX(startY, lane);
      items.push({
        type,
        lane,
        y: startY,
        x: getLaneX(-30, lane),
        width: 100,
        height: 100,
        partIndex: partIndex, // Store which image to use for parts
      });
    }, spawnInterval);

    function drawBackground() {
      // Enhanced 3D sky gradient
      const skyGradient = ctx.createLinearGradient(0, 0, 0, 500);
      skyGradient.addColorStop(0, "#4a90e2");
      skyGradient.addColorStop(0.5, "#87CEEB");
      skyGradient.addColorStop(1, "#B0E0E6");
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, canvas.width, 500);

      // Enhanced 3D ground gradient with depth
      const groundGradient = ctx.createLinearGradient(0, 500, 0, canvas.height);
      groundGradient.addColorStop(0, "#2a5a2a");
      groundGradient.addColorStop(0.3, "#228B22");
      groundGradient.addColorStop(1, "#1a4d1a");
      ctx.fillStyle = groundGradient;
      ctx.fillRect(0, 500, canvas.width, canvas.height - 500);

      // Add atmospheric perspective overlay
      const atmosphereGradient = ctx.createRadialGradient(
        canvas.width / 2, 500, 100,
        canvas.width / 2, 500, canvas.width
      );
      atmosphereGradient.addColorStop(0, "rgba(255, 255, 255, 0.1)");
      atmosphereGradient.addColorStop(1, "rgba(135, 206, 235, 0.05)");
      ctx.fillStyle = atmosphereGradient;
      ctx.fillRect(0, 0, canvas.width, 500);
    }

    function drawRoad() {
      const roadBottom = canvas.width;
      const roadTop = canvas.width * 0.4;
      const roadStart = canvas.height;
      const roadEnd = 500;

      // Road gradient for 3D depth effect
      const roadGradient = ctx.createLinearGradient(0, roadEnd, 0, roadStart);
      roadGradient.addColorStop(0, "#3a3a3a");
      roadGradient.addColorStop(0.5, "#2C2C2C");
      roadGradient.addColorStop(1, "#1a1a1a");
      ctx.fillStyle = roadGradient;

      ctx.beginPath();
      ctx.moveTo(canvas.width / 2 - roadBottom / 2, roadStart);
      ctx.lineTo(canvas.width / 2 + roadBottom / 2, roadStart);
      ctx.lineTo(canvas.width / 2 + roadTop / 2, roadEnd);
      ctx.lineTo(canvas.width / 2 - roadTop / 2, roadEnd);
      ctx.closePath();
      ctx.fill();

      // Add 3D shadow to road edges
      ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
      ctx.shadowBlur = 30;
      ctx.shadowOffsetX = -15;
      ctx.shadowOffsetY = 0;

      // Left road edge with glow
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2 - roadBottom / 2 + 15, roadStart);
      ctx.lineTo(canvas.width / 2 - roadTop / 2 + 15, roadEnd);
      ctx.stroke();

      ctx.shadowOffsetX = 15;

      // Right road edge with glow
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2 + roadBottom / 2 - 15, roadStart);
      ctx.lineTo(canvas.width / 2 + roadTop / 2 - 15, roadEnd);
      ctx.stroke();

      // Reset shadow
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    function drawMiddleLine() {
      const centerX = canvas.width / 2;
      const height = lineHeight;
      let segmentY = 500 + offset; // Start right at road top (Y=500)

      let topWidth = 8;
      let bottomWidth = topWidth + 3;

      while (segmentY < canvas.height) {
        // Add 3D shadow to line segments
        ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;

        // Create gradient for 3D effect
        const lineGradient = ctx.createLinearGradient(
          centerX - bottomWidth / 2, segmentY,
          centerX + bottomWidth / 2, segmentY
        );
        lineGradient.addColorStop(0, "#d0d0d0");
        lineGradient.addColorStop(0.5, "#FFFFFF");
        lineGradient.addColorStop(1, "#d0d0d0");
        ctx.fillStyle = lineGradient;

        ctx.beginPath();
        ctx.moveTo(centerX - topWidth / 2, segmentY);
        ctx.lineTo(centerX + topWidth / 2, segmentY);
        ctx.lineTo(centerX + bottomWidth / 2, segmentY + height);
        ctx.lineTo(centerX - bottomWidth / 2, segmentY + height);
        ctx.closePath();
        ctx.fill();

        segmentY += lineSpacing;
        topWidth = bottomWidth + 2;
        bottomWidth = topWidth + 2;
      }

      // Reset shadow
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    function drawDMiddleLine() {
      const roadBottom = canvas.width;
      const roadTop = canvas.width * 0.4;
      const roadStart = canvas.height;
      const roadEnd = 500; // Match road top position

      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2 - 10, roadStart);
      ctx.lineTo(canvas.width / 2 - 5, roadEnd);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(canvas.width / 2 + 10, roadStart);
      ctx.lineTo(canvas.width / 2 + 5, roadEnd);
      ctx.stroke();
    }

    function spawnYellowLine() {
      yellowLine = {
        y: 500,
        height: 20,
        width: 100,
        speed: 0.6,
        maxHeight: canvas.height,
        sizeIncreaseRate: 0.1,
        stripeCount: 6,
        stripeGap: 6,
        imageWidth: 80,
        imageHeight: 80,
        loggedNearCrossing: false,
      };
      yellowLineSpawned = true;
    }

    function drawYellowLines() {
      if (!yellowLine || !gameRunning || paused) return;

      yellowLine.y += yellowLine.speed * game_speed;
      yellowLine.width += yellowLine.sizeIncreaseRate * game_speed;
      yellowLine.height += yellowLine.sizeIncreaseRate * 0.5 * game_speed;
      yellowLine.stripeGap += yellowLine.sizeIncreaseRate * 0.2 * game_speed;
      yellowLine.imageWidth += yellowLine.sizeIncreaseRate * game_speed;
      yellowLine.imageHeight += yellowLine.sizeIncreaseRate * 0.5 * game_speed;

      const roadTopY = 500;
      const roadBottomY = canvas.height;
      const roadTopWidth = canvas.width * 0.4;
      const roadBottomWidth = canvas.width;
      const t = Math.max(0, (yellowLine.y - roadTopY) / (roadBottomY - roadTopY));
      const roadWidthAtY = roadTopWidth + (roadBottomWidth - roadTopWidth) * t;
      const centerX = canvas.width / 2;
      const leftRoadEdge = centerX - roadWidthAtY / 2;
      const rightRoadEdge = centerX + roadWidthAtY / 2;

      const totalStripeWidth = roadWidthAtY - 40;
      const stripeWidth = totalStripeWidth / yellowLine.stripeCount;

      // Add 3D shadow to yellow lines
      ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
      ctx.shadowBlur = 15;
      ctx.shadowOffsetX = 4;
      ctx.shadowOffsetY = 4;

      for (let i = 0; i < yellowLine.stripeCount; i++) {
        const stripeXStart = leftRoadEdge + 20 + i * stripeWidth;
        const stripeXEnd = stripeXStart + (stripeWidth - yellowLine.stripeGap);

        // Gradient for 3D effect
        const yellowGradient = ctx.createLinearGradient(
          stripeXStart, yellowLine.y,
          stripeXEnd, yellowLine.y + yellowLine.height
        );
        yellowGradient.addColorStop(0, "#ffff88");
        yellowGradient.addColorStop(0.5, "#dafe0eff");
        yellowGradient.addColorStop(1, "#c0d800");
        ctx.fillStyle = yellowGradient;

        ctx.beginPath();
        ctx.moveTo(stripeXStart, yellowLine.y);
        ctx.lineTo(stripeXEnd, yellowLine.y);
        ctx.lineTo(stripeXEnd, yellowLine.y + yellowLine.height);
        ctx.lineTo(stripeXStart, yellowLine.y + yellowLine.height);
        ctx.closePath();
        ctx.fill();
      }

      // Reset shadow
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      if (walkImg.complete) {
        const imageX = centerX - yellowLine.imageWidth / 2;
        const imageY = yellowLine.y + yellowLine.height / 2 - yellowLine.imageHeight;
        ctx.drawImage(walkImg, imageX, imageY, yellowLine.imageWidth, yellowLine.imageHeight);
      } else {
        console.warn("Sidewalk image not yet loaded");
      }

      if (yellowLine && !yellowLine.loggedNearCrossing) {
        const tukRect = {
          x: tuk.x - tuk.width / 2,
          y: tuk.y - tuk.height / 2 + (tuk.height * 2) / 3,
          width: tuk.width,
          height: tuk.height / 3,
        };
        const crossingRect = {
          x: leftRoadEdge,
          y: yellowLine.y,
          width: roadWidthAtY,
          height: yellowLine.height,
        };

        const safeDistance = 400;
        const proximityDistance = 100;

        if (
          Math.abs(tukRect.y + tukRect.height - crossingRect.y) < safeDistance ||
          Math.abs(crossingRect.y + crossingRect.height - tukRect.y) < safeDistance
        ) {
          inSafeRange = true;
          console.log("Tuk in safe range (400px) of yellow lines");
        }

        if (
          Math.abs(tukRect.y + tukRect.height - crossingRect.y) < proximityDistance ||
          Math.abs(crossingRect.y + crossingRect.height - tukRect.y) < proximityDistance
        ) {
          console.log("You near the crossing lines");
          yellowLine.loggedNearCrossing = true;
          if (!isShowingNotification) {
            yellowLinePaused = true;
            showNotification('warning', 'You need to stop Vehicle!', null, 2000);
            $timeout(function () {
              yellowLinePaused = false;
              inSafeRange = false;
            }, 2000);
          }
        }
      }

      if (yellowLine && yellowLine.y > yellowLine.maxHeight) {
        yellowLine = null;
        yellowLinePaused = false;
        inSafeRange = false;
        $timeout(function () {
          $scope.crossLnHit = false;
          $scope.warn_msg = "";
        });
      }
    }

    function drawScore() {
      ctx.textAlign = "center";

      // Draw MARKS at the center top
      const marksText = marks.toString().padStart(3, "0");
      ctx.font = "bold 80px Arial";

      // Bottom shadow layer
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillText(marksText, canvas.width / 2 + 6, 136);

      // Dark outline
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 8;
      ctx.strokeText(marksText, canvas.width / 2, 130);

      // Gradient fill for 3D effect
      const scoreGradient = ctx.createLinearGradient(
        canvas.width / 2 - 100, 100,
        canvas.width / 2 + 100, 130
      );
      scoreGradient.addColorStop(0, "#FFD700");
      scoreGradient.addColorStop(0.5, "#FFFFFF");
      scoreGradient.addColorStop(1, "#FFD700");
      ctx.fillStyle = scoreGradient;
      ctx.fillText(marksText, canvas.width / 2, 130);

      // Top highlight
      ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
      ctx.lineWidth = 2;
      ctx.strokeText(marksText, canvas.width / 2 - 1, 128);

      // Draw TIMER at the top left (next to fuel bar)
      const timerText = gameTimer.toString() + "s";
      ctx.textAlign = "left";
      ctx.font = "bold 60px Arial";

      // Shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillText(timerText, 50, 200);

      // Outline
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 6;
      ctx.strokeText(timerText, 50, 195);

      // Fill
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText(timerText, 50, 195);
    }

    function drawGoldenAnimation() {
      if (showGoldenAnimation && goldenAnimationTimer > 0) {
        goldenAnimationTimer--;

        // Calculate pulse scale
        const scale = 1 + (Math.sin(goldenAnimationTimer * 0.3) * 0.2);

        ctx.save();
        ctx.textAlign = "center";
        ctx.font = `bold ${100 * scale}px Arial`;

        // Golden glow
        ctx.shadowColor = "rgba(255, 215, 0, 0.8)";
        ctx.shadowBlur = 40;

        // Draw +10
        const alpha = goldenAnimationTimer / 60;
        ctx.globalAlpha = alpha;

        // Shadow
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillText("+10", canvas.width / 2 + 8, canvas.height / 2 + 8);

        // Outline
        ctx.strokeStyle = "#8B4500";
        ctx.lineWidth = 8;
        ctx.strokeText("+10", canvas.width / 2, canvas.height / 2);

        // Golden gradient
        const goldGradient = ctx.createLinearGradient(
          canvas.width / 2 - 50, canvas.height / 2 - 50,
          canvas.width / 2 + 50, canvas.height / 2 + 50
        );
        goldGradient.addColorStop(0, "#FFD700");
        goldGradient.addColorStop(0.5, "#FFA500");
        goldGradient.addColorStop(1, "#FFD700");
        ctx.fillStyle = goldGradient;
        ctx.fillText("+10", canvas.width / 2, canvas.height / 2);

        ctx.restore();

        if (goldenAnimationTimer <= 0) {
          showGoldenAnimation = false;
        }
      }
    }

    function drawRedAnimation() {
      if (showRedAnimation && redAnimationTimer > 0) {
        redAnimationTimer--;

        // Calculate pulse scale
        const scale = 1 + (Math.sin(redAnimationTimer * 0.3) * 0.2);

        ctx.save();
        ctx.textAlign = "center";
        ctx.font = `bold ${100 * scale}px Arial`;

        // Red glow
        ctx.shadowColor = "rgba(255, 0, 0, 0.8)";
        ctx.shadowBlur = 40;

        // Draw -5
        const alpha = redAnimationTimer / 60;
        ctx.globalAlpha = alpha;

        // Shadow
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillText("-5", canvas.width / 2 + 8, canvas.height / 2 + 8);

        // Outline
        ctx.strokeStyle = "#8B0000";
        ctx.lineWidth = 8;
        ctx.strokeText("-5", canvas.width / 2, canvas.height / 2);

        // Red gradient
        const redGradient = ctx.createLinearGradient(
          canvas.width / 2 - 50, canvas.height / 2 - 50,
          canvas.width / 2 + 50, canvas.height / 2 + 50
        );
        redGradient.addColorStop(0, "#FF4444");
        redGradient.addColorStop(0.5, "#FF0000");
        redGradient.addColorStop(1, "#FF4444");
        ctx.fillStyle = redGradient;
        ctx.fillText("-5", canvas.width / 2, canvas.height / 2);

        ctx.restore();

        if (redAnimationTimer <= 0) {
          showRedAnimation = false;
        }
      }
    }

    function checkCollision(item, tuk) {
      return (
        item.x < tuk.x + item.width &&
        item.x + item.width > tuk.x &&
        item.y < tuk.y + item.height &&
        item.y + item.height > tuk.y
      );
    }

    function drawItems() {
      items.forEach((item) => {
        if (!paused) {
          item.y += game_speed;
          item.x = getLaneX(item.y, item.lane);
        }

        let img = null;

        // Get the correct image based on item type
        if (item.type === "genuine") {
          img = genuinePartsImages[item.partIndex];
        } else if (item.type === "nongenuine") {
          img = nonGenuinePartsImages[item.partIndex];
        } else {
          img = itemImages[item.type];
        }

        if (img && img.complete) {
          const size = 110;  // Increased size for better visibility on kiosk

          // Draw 3D shadow for items
          ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
          ctx.shadowBlur = 20;
          ctx.shadowOffsetX = 6;
          ctx.shadowOffsetY = 6;

          // Add glow effect for collectibles
          if (item.type !== "barrier") {
            ctx.shadowColor = "rgba(255, 200, 50, 0.6)";
            ctx.shadowBlur = 25;
          }

          // Add green glow for genuine parts
          if (item.type === "genuine") {
            ctx.shadowColor = "rgba(50, 255, 50, 0.8)";
            ctx.shadowBlur = 30;
          }

          ctx.drawImage(img, item.x - size / 2, item.y - size / 2, size, size);

          // Reset shadow
          ctx.shadowColor = "transparent";
          ctx.shadowBlur = 0;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
        }

        if (gameRunning && !paused) {
          const itemRect = {
            x: item.x - 55,
            y: item.y - 55,
            width: 110,
            height: 110,
          };

          const tukRect = {
            x: tuk.x - tuk.width / 2,
            y: tuk.y - tuk.height / 2 + (tuk.height * 2) / 3,
            width: tuk.width,
            height: tuk.height / 3,
          };

          // Use position-based collision detection (no lane check needed with smooth transitions)
          if (checkCollision(itemRect, tukRect)) {
            if (item.type === "fuel") {
              fuel = 100;
              lowFuelWarning = false;
              item.collected = true;
              $scope.tel();
            } else if (item.type === "genuine") {
              // Correct genuine part - add marks and show golden animation
              marks += 10;
              item.collected = true;
              showGoldenAnimation = true;
              goldenAnimationTimer = 60; // Show for 1 second (60 frames)

              // Show top notification without pausing
              showTopNotification('genuine', 'This is GENUINE! +10 Marks', null, 2000);
              console.log("Genuine part collected! +10 marks");
            } else if (item.type === "nongenuine") {
              // Wrong non-genuine part - subtract marks and show red animation
              marks = Math.max(0, marks - 5);
              item.collected = true;
              showRedAnimation = true;
              redAnimationTimer = 60; // Show for 1 second (60 frames)

              // Show top notification with image without pausing
              showTopNotification('non-genuine', 'This is NOT GENUINE! -5 Marks', nonGenuinePartsPaths[item.partIndex], 2000);
              console.log("Non-genuine part collected! -5 marks");
            } else if (item.type === "barrier") {
              $scope.msg = "බාධකයක හැපුණා!"; // Barrier collision message
              gameOver();
              return;
            }
          }
        }
      });

      for (let i = items.length - 1; i >= 0; i--) {
        if (items[i].y > canvas.height + 50 || items[i].collected) {
          items.splice(i, 1);
        }
      }
    }

    $scope.tel = function () {
      console.log("Fuel collected");
    };

    // Notification queue management system
    function showNotification(type, message, imagePath = null, duration = 2000) {
      // Don't show notifications if game is over
      if (!gameRunning) {
        return;
      }

      // If a notification is currently showing, queue this one
      if (isShowingNotification) {
        notificationQueue.push({ type, message, imagePath, duration });
        return;
      }

      isShowingNotification = true;
      currentNotificationType = type;
      paused = true;
      $scope.pause = true;
      pauseMusic();
      tuk_sound.pause();

      $timeout(function() {
        if (type === 'warning') {
          $scope.warn_msg = message;
          $scope.crossLnHit = true;
          $scope.showAppreciation = false;
          $scope.showWrongPartAlert = false;
        } else if (type === 'appreciation') {
          $scope.appreciation_msg = message;
          $scope.showAppreciation = true;
          $scope.crossLnHit = false;
          $scope.showWrongPartAlert = false;
        } else if (type === 'wrongpart') {
          $scope.wrongPartImage = imagePath;
          $scope.showWrongPartAlert = true;
          $scope.crossLnHit = false;
          $scope.showAppreciation = false;
        }

        // Auto close after duration
        $timeout(function() {
          closeCurrentNotification();
          processNextNotification();
        }, duration);
      });
    }

    function closeCurrentNotification() {
      $scope.crossLnHit = false;
      $scope.showAppreciation = false;
      $scope.showWrongPartAlert = false;
      $scope.warn_msg = "";
      $scope.appreciation_msg = "";
      isShowingNotification = false;
      currentNotificationType = null;

      // Only resume if game is still running
      if (gameRunning && !yellowLinePaused) {
        $scope.resumeGame();
      }
    }

    function processNextNotification() {
      if (notificationQueue.length > 0) {
        const next = notificationQueue.shift();
        showNotification(next.type, next.message, next.imagePath, next.duration);
      }
    }

    function clearNotificationQueue() {
      notificationQueue = [];
      if (isShowingNotification) {
        closeCurrentNotification();
      }
    }

    function drawTuk() {
      // Smooth transition to target lane
      tuk.targetX = getLaneX(tuk.y, tuk.targetLane);

      // Lerp (linear interpolation) for smooth movement
      if (Math.abs(tuk.x - tuk.targetX) > 1) {
        tuk.x += (tuk.targetX - tuk.x) * tuk.transitionSpeed;
      } else {
        tuk.x = tuk.targetX;
        tuk.lane = tuk.targetLane; // Update actual lane when transition complete
      }

      if (tukImg.complete) {
        // Draw 3D shadow for the tuk
        ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
        ctx.shadowBlur = 30;
        ctx.shadowOffsetX = 10;
        ctx.shadowOffsetY = 15;

        // Draw ground shadow
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        ctx.beginPath();
        ctx.ellipse(
          tuk.x,
          tuk.y + tuk.height / 2 + 10,
          tuk.width / 2.5,
          tuk.height / 8,
          0, 0, Math.PI * 2
        );
        ctx.fill();
        ctx.globalAlpha = 1;

        // Draw tuk with 3D depth
        ctx.drawImage(
          tukImg,
          tuk.x - tuk.width / 2,
          tuk.y - tuk.height / 2,
          tuk.width,
          tuk.height
        );

        // Reset shadow
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }
    }

    function gameOver() {
      gameRunning = false;
      paused = true; // Ensure game is fully paused

      // Stop ALL sounds immediately
      pauseMusic();
      tuk_sound.pause();
      tuk_sound.currentTime = 0; // Reset tuk sound to beginning

      // Stop timer
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }

      // Clear all notifications and prevent new ones
      clearNotificationQueue();
      isShowingNotification = false;

      // Close any open notifications
      $timeout(function () {
        $scope.crossLnHit = false;
        $scope.showAppreciation = false;
        $scope.showWrongPartAlert = false;
        $scope.warn_msg = "";
        yellowLinePaused = false;
        inSafeRange = false;
      });

      // Show final marks instead of score
      finalScoreEl.textContent = `Final Marks: ${marks}`;
      gameOverModal.style.display = "block";
    }

    function resetGame() {
      gameRunning = true;
      game_speed = 5;
      marks = 0;
      fuel = 100;
      lowFuelWarning = false;
      items.length = 0;
      trees.length = 0;
      houses.length = 0;
      tuk.lane = "left";
      tuk.targetLane = "left"; // Reset target lane
      tuk.x = getLaneX(tuk.y, "left"); // Reset position
      tuk.targetX = tuk.x;
      offset = 0;
      yellowLine = null;
      paused = false;
      $scope.pause = false;
      doubleLineActive = false;
      doubleLineTimer = 0;
      doubleLineLogged = false;
      barrierCooldown = 0;
      yellowLinePaused = false;
      inSafeRange = false;
      yellowLineSpawned = false;
      showGoldenAnimation = false;
      goldenAnimationTimer = 0;
      showRedAnimation = false;
      redAnimationTimer = 0;
      $scope.msg = ""; // Clear game over message

      // Clear notification system
      clearNotificationQueue();
      $scope.showWrongPartAlert = false;
      $scope.showAppreciation = false;
      $scope.crossLnHit = false;

      // Reset timer to 60 seconds
      gameTimer = 60;
      if (timerInterval) {
        clearInterval(timerInterval);
      }

      // Start 60 second countdown
      timerInterval = setInterval(() => {
        if (gameRunning && !paused) {
          gameTimer--;
          if (gameTimer <= 0) {
            gameTimer = 0;
            clearInterval(timerInterval);
            timerInterval = null;
            $scope.msg = "Time's up!";
            gameOver();
          }
        }
      }, 1000);

      $timeout(function () {
        $scope.crossLnHit = false;
        $scope.warn_msg = "";
      });
      initializeTrees();
      initializeHouses();
      updateBars();
      gameOverModal.style.display = "none";
      animate();
    }

    $scope.pauseGame = function () {
      if (gameRunning && !paused) {
        paused = true;
        $scope.pause = true;
        pauseMusic();
        tuk_sound.pause();
        console.log("Game paused");
        // Only show appreciation if game is still running
        if (gameRunning && inSafeRange && yellowLine && !isShowingNotification) {
          yellowLine = null;
          showNotification('appreciation', 'Good job stopping! 🎉', null, 2000);
          $timeout(function () {
            yellowLinePaused = false;
            inSafeRange = false;
          }, 2000);
        }
      }
    };

    $scope.resumeGame = function () {
      if (gameRunning && paused) {
        paused = false;
        $scope.pause = false;
        playMusic();
        tuk_sound.play();
        animate();
        console.log("Game resumed");
      }
    };

    canvas.addEventListener("swiped-left", () => {
      if (gameRunning && !paused && tuk.targetLane === "right") {
        tuk.targetLane = "left"; // Set target lane for smooth transition
        if (doubleLineActive && !doubleLineLogged && !isShowingNotification) {
          doubleLineLogged = true;
          showNotification('warning', 'You crossed the Double line!!!', null, 2000);
          console.log("You cross Double line!!!");
        }
        if (yellowLinePaused && !isShowingNotification) {
          showNotification('warning', 'You need to stop Vehicle!', null, 2000);
          $timeout(function () {
            yellowLinePaused = false;
            inSafeRange = false;
          }, 2000);
        }
      }
    });

    canvas.addEventListener("swiped-right", () => {
      if (gameRunning && !paused && tuk.targetLane === "left") {
        tuk.targetLane = "right"; // Set target lane for smooth transition
        if (doubleLineActive && !doubleLineLogged && !isShowingNotification) {
          doubleLineLogged = true;
          showNotification('warning', 'You crossed the Double line!!!', null, 2000);
          console.log("You cross Double line!!!");
        }
        if (yellowLinePaused && !isShowingNotification) {
          showNotification('warning', 'You need to stop Vehicle!', null, 2000);
          $timeout(function () {
            yellowLinePaused = false;
            inSafeRange = false;
          }, 2000);
        }
      }
    });

    tryAgainBtn.addEventListener("click", resetGame);

    document.addEventListener('keydown', (event) => {
      if (event.key === 'p' || event.key === 'P') {
        if (paused) {
          $scope.resumeGame();
        } else {
          $scope.pauseGame();
        }
      }
    });

    let animationId;

    function animate() {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }

      if (paused) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawBackground();
        drawHouses();
        drawTrees();
        drawRoad();
        if (doubleLineActive) {
          drawDMiddleLine();
        } else {
          drawMiddleLine();
        }
        drawYellowLines();
        drawItems();
        drawTuk();
        drawScore();

        // 3D Paused text
        ctx.textAlign = "center";
        ctx.font = "bold 120px Arial";

        // Shadow layer
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillText("PAUSED", canvas.width / 2 + 8, canvas.height / 2 + 8);

        // Outline
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 10;
        ctx.strokeText("PAUSED", canvas.width / 2, canvas.height / 2);

        // Gradient fill
        const pauseGradient = ctx.createLinearGradient(
          0, canvas.height / 2 - 60,
          0, canvas.height / 2 + 60
        );
        pauseGradient.addColorStop(0, "#FFD700");
        pauseGradient.addColorStop(0.5, "#FFFFFF");
        pauseGradient.addColorStop(1, "#FFD700");
        ctx.fillStyle = pauseGradient;
        ctx.fillText("PAUSED", canvas.width / 2, canvas.height / 2);

        // Highlight
        ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
        ctx.lineWidth = 3;
        ctx.strokeText("PAUSED", canvas.width / 2 - 2, canvas.height / 2 - 2);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      tuk.y = canvas.height - 220; // Adjusted for larger tuk size (200x350)

      // Animate middle line offset for scrolling effect
      offset += game_speed;
      if (offset >= lineSpacing) {
        offset = 0;
      }

      drawBackground();
      updateHouses();
      drawHouses();
      updateTrees();
      drawTrees();
      drawRoad();
      if (doubleLineActive) {
        drawDMiddleLine();
        doubleLineTimer += 1000 / 60;
        if (doubleLineTimer >= 4000) {
          const wasDoubleLineLogged = doubleLineLogged;
          doubleLineActive = false;
          doubleLineTimer = 0;
          doubleLineLogged = false;
          barrierCooldown = 2000;
          // Only show appreciation if game is still running
          if (gameRunning && !wasDoubleLineLogged && !isShowingNotification) {
            showNotification('appreciation', 'Excellent! You stayed in your lane! 🎉', null, 2000);
            console.log("Good job!");
          }
        }
      } else {
        drawMiddleLine();
        if (barrierCooldown > 0) {
          barrierCooldown -= 1000 / 60;
        }
      }
      drawYellowLines();
      drawItems();
      drawTuk();
      drawScore();
      drawGoldenAnimation(); // Draw golden animation on top
      drawRedAnimation(); // Draw red animation on top

      if (gameRunning) {
        fuel = Math.max(0, fuel - fuelDecreaseRate);

        if (fuel < 30) lowFuelWarning = true;

        updateBars();

        // Spawn yellow line based on marks instead of score
        if (marks >= 50 && !yellowLine && !yellowLineSpawned) {
          spawnYellowLine();
        }

        // Spawn double line based on marks instead of score
        if (marks >= 100 && !doubleLineActive) {
          doubleLineActive = true;
          doubleLineTimer = 0;
          doubleLineLogged = false;
        }

        // Game over only on fuel out
        if (fuel <= 0) {
          $scope.msg = "තෙල් නෑ!";
          $timeout(function () {
            gameOver();
          });
        }
      }

      animationId = requestAnimationFrame(animate);
    }

    setInterval(() => {
      if (gameRunning && !paused) {
        game_speed += 1;
      }
    }, 8000);

    $scope.page = 1;
    $scope.sound_rep = function () {
      $timeout(function () {
        $scope.sound_rep();
        tuk_sound.currentTime = 0;
        tuk_sound.play();
      }, 18000);
    };

    $scope.start_game = function () {
      $scope.page = 3;
      resizeCanvas();
      initializeTrees();
      initializeHouses();
      updateBars();

      // Start 60 second timer
      gameTimer = 60;
      if (timerInterval) {
        clearInterval(timerInterval);
      }
      timerInterval = setInterval(() => {
        if (gameRunning && !paused) {
          gameTimer--;
          if (gameTimer <= 0) {
            gameTimer = 0;
            clearInterval(timerInterval);
            timerInterval = null;
            $scope.msg = "Time's up!";
            gameOver();
          }
        }
      }, 1000);

      animate();
      soundManager();
      playMusic();
      tuk_sound.play();
      $scope.sound_rep();
    };

    $scope.page_change = function () {
      $scope.page = 3;
    };

    function game_on() {
      $scope.page_change();
      resizeCanvas();
      initializeTrees();
      initializeHouses();
      updateBars();
      animate();
      soundManager();
      playMusic();
      tuk_sound.play();
      $scope.sound_rep();
    }

    $scope.next = function () {
      // Validate terms acceptance
      if (!$scope.formData.termsAccepted) {
        alert('Please accept the Terms & Conditions to continue.');
        return;
      }

      console.log("Form data:", $scope.formData);
      // Go to music selection page
      $scope.page = 2;
    };

    // Start game after music selection
    $scope.startGame = function () {
      if ($scope.selectedMusic === null) {
        alert('Please select a music option to continue.');
        return;
      }

      console.log("Starting game with music:", $scope.selectedMusic);

      // Initialize the selected music
      initializeMusic();

      // Reset game state to ensure clean start
      gameRunning = true;
      paused = false;
      $scope.pause = false;
      game_speed = 5;
      marks = 0;
      fuel = 100;
      items.length = 0;
      trees.length = 0;
      houses.length = 0;
      tuk.lane = "left";
      tuk.targetLane = "left";
      tuk.targetX = 0;

      // Go to game page
      $scope.page = 3;

      // Wait for page to render before initializing game
      $timeout(function() {
        resizeCanvas();
        initializeTrees();
        initializeHouses();
        updateBars();
        soundManager();

        console.log("Game starting - paused:", paused, "gameRunning:", gameRunning);

        // Start 60 second timer
        gameTimer = 60;
        if (timerInterval) {
          clearInterval(timerInterval);
        }
        timerInterval = setInterval(() => {
          if (gameRunning && !paused) {
            gameTimer--;
            if (gameTimer <= 0) {
              gameTimer = 0;
              clearInterval(timerInterval);
              timerInterval = null;
              $scope.msg = "Time's up!";
              gameOver();
            }
          }
        }, 1000);

        animate();
        playMusic();
        tuk_sound.play();
        $scope.sound_rep();
      }, 100); // 100ms delay to ensure DOM is ready
    };

    function resizeCanvas() {
      const canvas = document.getElementById("gameCanvas");

      if (canvas) {
        // Fixed dimensions for 1080x1920 kiosk
        canvas.width = 1080;
        canvas.height = 1920;
      }
    }

    let soundManagerInitialized = false;
    function soundManager() {
      if (soundManagerInitialized) return; // Only attach listener once

      const loop_start = 5;
      const loop_end = 10;
      const soundIcon = document.querySelector(".sound-icon");
      if (!soundIcon) return;

      let isPlaying = false;
      soundIcon.addEventListener("click", function () {
        if (isPlaying) {
          pauseMusic();
          tuk_sound.pause();
          soundIcon.classList.add("muted");
        } else {
          playMusic();
          tuk_sound.play();
          soundIcon.classList.remove("muted");
        }
        isPlaying = !isPlaying;
      });
      soundManagerInitialized = true;
    }

    // Fixed canvas dimensions for kiosk - no need for resize listeners
    window.addEventListener("load", resizeCanvas);
  }
);