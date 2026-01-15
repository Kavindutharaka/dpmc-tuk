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
    let engine = 100;
    const fuelDecreaseRate = 0.1;
    const engineDecreaseRate = 0.09;
    const fuelBar = document.getElementById("fuelBar");
    const engineBar = document.getElementById("engineBar");
    let lowFuelWarning = false;
    let lowEngineWarning = false;

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

    var sindu = new Audio("./audio/radio.mp3");
    var tuk_sound = new Audio("./audio/tuk_sound.mp3");

    const items = [];
    const itemTypes = ["barrier", "tool", "fuel", "logo"];
    const spawnInterval = 1500;
    const itemImages = {
      barrier: new Image(),
      tool: new Image(),
      fuel: new Image(),
      logo: new Image(),
    };
    const tukImg = new Image();
    const tuk = {
      lane: "left",
      y: 0,
      x: 0,
      width: 130,
      height: 240,
    };

    const treeImages = [];
    for (let i = 1; i <= 7; i++) {
      const treeImg = new Image();
      treeImg.src = `images/trees/t${i}.gif`;
      treeImages.push(treeImg);
    }

    const trees = [];
    const treeSpawnRate = 0.05;

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
          size: 40 + Math.random() * 20,
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
          size: 40 + Math.random() * 20,
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
        size: 40 + Math.random() * 20,
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
    itemImages.tool.src = "./gear.png";
    itemImages.fuel.src = "./fuel.png";
    itemImages.logo.src = "./logo.jpeg";

    tukImg.src = "./center-tuk.png";

    function updateBars() {
      fuelBar.style.width = fuel + "%";
      engineBar.style.width = engine + "%";
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
      if (fuel < 30 && !lowFuelWarning) {
        type = "fuel";
      } else if (engine < 30 && !lowEngineWarning) {
        type = "tool";
      } else {
        const availableTypes = doubleLineActive || barrierCooldown > 0
          ? itemTypes.filter(t => t !== "barrier")
          : itemTypes;
        type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
      }

      const x = getLaneX(startY, lane);
      items.push({
        type,
        lane,
        y: startY,
        x: getLaneX(-30, lane),
        width: 100,
        height: 100,
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
      const stripeWidth = totalStripeWidth / (yellowLine.stripeCount * 2 - 1);

      // Add 3D shadow to yellow lines
      ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
      ctx.shadowBlur = 15;
      ctx.shadowOffsetX = 4;
      ctx.shadowOffsetY = 4;

      for (let i = 0; i < yellowLine.stripeCount; i++) {
        const stripeXStart = leftRoadEdge + 20 + i * (stripeWidth + yellowLine.stripeGap);
        const stripeXEnd = stripeXStart + stripeWidth;

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
          if (!paused) {
            $scope.pauseGame();
            yellowLinePaused = true;
            $timeout(function () {
              $scope.crossLnHit = true;
              $scope.warn_msg = "You need to stop Vehicle";
              console.log("You need to stop Vehicle");
              $timeout(function () {
                $scope.resumeGame();
                $scope.crossLnHit = false;
                $scope.warn_msg = "";
                yellowLinePaused = false;
                inSafeRange = false;
              }, 2000);
            });
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
      const scoreText = score.toString().padStart(4, "0");

      // 3D depth layers for score
      ctx.font = "bold 80px Arial";

      // Bottom shadow layer
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillText(scoreText, canvas.width / 2 + 6, 136);

      // Dark outline
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 8;
      ctx.strokeText(scoreText, canvas.width / 2, 130);

      // Gradient fill for 3D effect
      const scoreGradient = ctx.createLinearGradient(
        canvas.width / 2 - 100, 100,
        canvas.width / 2 + 100, 130
      );
      scoreGradient.addColorStop(0, "#FFD700");
      scoreGradient.addColorStop(0.5, "#FFFFFF");
      scoreGradient.addColorStop(1, "#FFD700");
      ctx.fillStyle = scoreGradient;
      ctx.fillText(scoreText, canvas.width / 2, 130);

      // Top highlight
      ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
      ctx.lineWidth = 2;
      ctx.strokeText(scoreText, canvas.width / 2 - 1, 128);
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

        const img = itemImages[item.type];

        if (img.complete) {
          const size = 80;  // Increased size for better visibility on 1080x1920

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

          ctx.drawImage(img, item.x - size / 2, item.y - size / 2, size, size);

          // Reset shadow
          ctx.shadowColor = "transparent";
          ctx.shadowBlur = 0;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
        }

        if (gameRunning && !paused) {
          const itemRect = {
            x: item.x - 40,
            y: item.y - 40,
            width: 80,
            height: 80,
          };

          const tukRect = {
            x: tuk.x - tuk.width / 2,
            y: tuk.y - tuk.height / 2 + (tuk.height * 2) / 3,
            width: tuk.width,
            height: tuk.height / 3,
          };

          if (checkCollision(itemRect, tukRect) && tuk.lane === item.lane) {
            if (item.type === "fuel") {
              fuel = 100;
              lowFuelWarning = false;
              item.collected = true;
              $scope.tel();
            } else if (item.type === "tool") {
              engine = 100;
              lowEngineWarning = false;
              item.collected = true;
            } else if (item.type === "logo") {
              score += 100;
              item.collected = true;
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

    function drawTuk() {
      tuk.x = getLaneX(tuk.y, tuk.lane);
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
      finalScoreEl.textContent = `Final Score: ${score.toString().padStart(4, "0")}`;
      gameOverModal.style.display = "block";
      $timeout(function () {
        $scope.crossLnHit = false;
        $scope.warn_msg = "";
        yellowLinePaused = false;
        inSafeRange = false;
      });
    }

    function resetGame() {
      gameRunning = true;
      game_speed = 5;
      score = 0;
      fuel = 100;
      engine = 100;
      lowFuelWarning = false;
      lowEngineWarning = false;
      items.length = 0;
      trees.length = 0;
      tuk.lane = "left";
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
      $scope.msg = ""; // Clear game over message
      $timeout(function () {
        $scope.crossLnHit = false;
        $scope.warn_msg = "";
      });
      initializeTrees();
      updateBars();
      gameOverModal.style.display = "none";
      animate();
    }

    $scope.pauseGame = function () {
      if (gameRunning && !paused) {
        paused = true;
        $scope.pause = true;
        sindu.pause();
        tuk_sound.pause();
        console.log("Game paused");
        if (inSafeRange && yellowLine) {
          yellowLine = null;
          $timeout(function () {
            $scope.crossLnHit = true;
            $scope.warn_msg = "Good job stopping!";
            console.log("Good job stopping!");
            $timeout(function () {
              $scope.resumeGame();
              $scope.crossLnHit = false;
              $scope.warn_msg = "";
              yellowLinePaused = false;
              inSafeRange = false;
            }, 2000);
          });
        }
      }
    };

    $scope.resumeGame = function () {
      if (gameRunning && paused) {
        paused = false;
        $scope.pause = false;
        sindu.play();
        tuk_sound.play();
        animate();
        console.log("Game resumed");
      }
    };

    canvas.addEventListener("swiped-left", () => {
      if (gameRunning && !paused && tuk.lane === "right") {
        tuk.lane = "left";
        if (doubleLineActive && !doubleLineLogged) {
          doubleLineLogged = true;
          $timeout(function () {
            $scope.crossLnHit = true;
            $scope.warn_msg = "You cross Double line!!!";
            console.log("You cross Double line!!!");
            $timeout(function () {
              $scope.crossLnHit = false;
              $scope.warn_msg = "";
            }, 2000);
          });
        }
        if (yellowLinePaused) {
          $timeout(function () {
            $scope.crossLnHit = true;
            $scope.warn_msg = "You need to stop Vehicle";
            console.log("You need to stop Vehicle");
            $timeout(function () {
              $scope.resumeGame();
              $scope.crossLnHit = false;
              $scope.warn_msg = "";
              yellowLinePaused = false;
              inSafeRange = false;
            }, 2000);
          });
        }
      }
    });

    canvas.addEventListener("swiped-right", () => {
      if (gameRunning && !paused && tuk.lane === "left") {
        tuk.lane = "right";
        if (doubleLineActive && !doubleLineLogged) {
          doubleLineLogged = true;
          $timeout(function () {
            $scope.crossLnHit = true;
            $scope.warn_msg = "You cross Double line!!!";
            console.log("You cross Double line!!!");
            $timeout(function () {
              $scope.crossLnHit = false;
              $scope.warn_msg = "";
            }, 2000);
          });
        }
        if (yellowLinePaused) {
          $timeout(function () {
            $scope.crossLnHit = true;
            $scope.warn_msg = "You need to stop Vehicle";
            console.log("You need to stop Vehicle");
            $timeout(function () {
              $scope.resumeGame();
              $scope.crossLnHit = false;
              $scope.warn_msg = "";
              yellowLinePaused = false;
              inSafeRange = false;
            }, 2000);
          });
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

      tuk.y = canvas.height - 140;

      drawBackground();
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
          if (!wasDoubleLineLogged) {
            paused = true;
            $scope.pause = true;
            sindu.pause();
            tuk_sound.pause();
            $timeout(function () {
              $scope.crossLnHit = true;
              $scope.warn_msg = "Good job!";
              console.log("Good job!");
              $timeout(function () {
                $scope.resumeGame();
                $scope.crossLnHit = false;
                $scope.warn_msg = "";
              }, 2000);
            });
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

      if (gameRunning) {
        fuel = Math.max(0, fuel - fuelDecreaseRate);
        engine = Math.max(0, engine - engineDecreaseRate);

        if (fuel < 30) lowFuelWarning = true;
        if (engine < 30) lowEngineWarning = true;

        updateBars();

        if (score === 100 && !yellowLine && !yellowLineSpawned) {
          spawnYellowLine();
        }

        if (score === 400 && !doubleLineActive) {
          doubleLineActive = true;
          doubleLineTimer = 0;
          doubleLineLogged = false;
        }

        if (fuel <= 0 || engine <= 0) {
          if (engine <= 0) {
            $scope.msg = "එන්ජින් කොලස්!";
          } else if (fuel <= 0) {
            $scope.msg = "තෙල් නෑ!";
          }
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
      updateBars();
      animate();
      soundManager();
      sindu.play();
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
      updateBars();
      animate();
      soundManager();
      sindu.play();
      tuk_sound.play();
      $scope.sound_rep();
    }

    $scope.next = function () {
      $scope.page = 2;
      resizeCanvas();
      initializeTrees();
      updateBars();
      soundManager();
      $timeout(function () {
        sindu.play();
        tuk_sound.play();
        $scope.page = 3;
        animate();
      }, 6000);
    };

    function resizeCanvas() {
      const canvas = document.getElementById("gameCanvas");

      if (canvas) {
        // Fixed dimensions for 1080x1920 kiosk
        canvas.width = 1080;
        canvas.height = 1920;
      }
    }

    function soundManager() {
      const loop_start = 5;
      const loop_end = 10;
      const soundIcon = document.querySelector(".sound-icon");
      let isPlaying = false;
      soundIcon.addEventListener("click", function () {
        if (isPlaying) {
          sindu.pause();
          tuk_sound.pause();
          soundIcon.classList.add("muted");
        } else {
          sindu.play();
          tuk_sound.play();
          soundIcon.classList.remove("muted");
        }
        isPlaying = !isPlaying;
      });
    }

    // Fixed canvas dimensions for kiosk - no need for resize listeners
    window.addEventListener("load", resizeCanvas);

    document.addEventListener("DOMContentLoaded", function () {
      const soundIcon = document.querySelector(".sound-icon");
      let isPlaying = false;
      soundIcon.addEventListener("click", function () {
        if (isPlaying) {
          sindu.pause();
          tuk_sound.pause();
          soundIcon.classList.add("muted");
        } else {
          sindu.play();
          tuk_sound.play();
          soundIcon.classList.remove("muted");
        }
        isPlaying = !isPlaying;
      });
    });
  }
);