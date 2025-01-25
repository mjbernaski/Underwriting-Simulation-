let dots = [];
let histogramBins = [];
let binCount = 50;
let animationDuration = 6000; // 60 seconds for each animation
let pauseDuration = 5000;      // Changed to 5 seconds pause between runs
let startTime;
let numDots = 25000;
let dotSize = 2;             // Added dot size variable
let iterationCount = 0;
let maxIterations = 5;
let isPaused = false;
let pauseStartTime;
let maxDotSize = 4;
let fadeStartDelay = 2000;  // Start fading 2 seconds after arrival
let fadeDuration = 30000;   // Take 30 seconds to fade out completely
let showConnections = false;
let connectedDots = [];
let numConnections = 40;
let connectionAlpha = 60;  // Reduced from 120 to make lines fainter
let constellationFadeDuration = 3000; // Time to fade out unconnected dots
let constellationStartTime = 0;
let running = true;
let constellationColor;
let constellationsPerHistogram = 1;
let currentConstellation = 0;
let usedDots = new Set();  // Track dots used across all constellations
let numConstellations = 3;  // Parameter for number of constellations
let constellations = [];    // Array to hold all constellation data
let portfolioAverageX = 0;  // Store the average x position
let graphics;  // Remove this
let blobVertices = [];  // Remove this
let noiseOffset = 0;  // Remove this
let constellationWidths = [];  // Array to store all constellation widths
let constellationStyle = "both";  // can be "line", "shape", or "both"

// Add this class to organize constellation data
class Constellation {
  constructor() {
    this.dots = new Set();
    this.connections = [];
    this.color = null;
  }
}

function setup() {
  createCanvas(3200, 1700);  // Remove WEBGL
  
  // Initialize histogram bins
  for (let i = 0; i < binCount; i++) {
    histogramBins[i] = 0;
  }
  
  // Start first animation
  resetAnimation();
}

function resetAnimation() {
  dots = [];
  histogramBins.fill(0);
  startTime = millis();
  showConnections = false;
  constellations = [];
  currentConstellation = 0;
  usedDots.clear();
  
  // Add some random variation to the normal distribution
  let skew = random(-0.3, 0.3);  // Random skew factor
  let spread = random(0.8, 1.2);  // Random spread factor
  
  // Generate dots with slightly varied normal distribution
  for (let i = 0; i < numDots; i++) {
    let u1 = random();
    let u2 = random();
    let z = sqrt(-2 * log(u1)) * cos(TWO_PI * u2);
    
    // Apply variation
    z = z * spread + skew;  // Modify the z-score
    
    let x = map(z, -3, 3, 100, width-100);
    let binIndex = floor(map(x, 0, width, 0, binCount));
    binIndex = constrain(binIndex, 0, binCount - 1);
    histogramBins[binIndex]++;
    
    dots.push({
      x: random(width),
      y: random(height),
      targetX: x,
      targetY: height - 100 - (histogramBins[binIndex] * 1),
      arrived: false,
      arrivalTime: 0
    });
  }
  
  // Calculate portfolio average after generating all dots
  let totalX = 0;
  for (let dot of dots) {
    totalX += dot.targetX;
  }
  portfolioAverageX = totalX / dots.length;
  
  if (!running) {
    constellationWidths = [];  // Clear widths when animation stops
  }
}

function draw() {
  background(0);
  
  let currentTime = millis() - startTime;
  
  if (isPaused) {
    drawDots();
    drawScale();
    if (showConnections) {
      drawConnections();
      drawConstellationWidth();
    }
    
    // Check if pause is over
    if (millis() - pauseStartTime >= pauseDuration) {
      isPaused = false;
      currentConstellation = 0;
      showConnections = false;
      constellations = [];
      if (running) {
        resetAnimation();
      }
    }
  } else {
    drawDots();
    drawScale();
    
    // Check if animation is complete
    if (currentTime >= animationDuration) {
      isPaused = true;
      pauseStartTime = millis();
      currentConstellation = 0;
      constellations = [];
      createConnections();
    }
  }
}

function drawDots() {
  let currentTime = millis();
  
  // Update and draw dots
  for (let dot of dots) {
    if (!dot.arrived && !isPaused) {
      // Move dots towards target
      dot.x = lerp(dot.x, dot.targetX, 0.05);
      dot.y = lerp(dot.y, dot.targetY, 0.05);
      
      if (dist(dot.x, dot.y, dot.targetX, dot.targetY) < 1) {
        dot.arrived = true;
        dot.arrivalTime = currentTime;
      }
    }
    
    let alpha = 255;
    let sizeFactor = 1;
    
    if (showConnections) {
      let constellationTime = currentTime - constellationStartTime;
      if (!dot.inConstellation) {
        let fadeProgress = constellationTime / constellationFadeDuration;
        alpha = lerp(255, 50, constrain(fadeProgress, 0, 1));
      } else {
        sizeFactor = 2;
      }
    } else if (dot.arrived) {
      let timeSinceArrival = currentTime - dot.arrivalTime;
      if (timeSinceArrival > fadeStartDelay) {
        let fadeProgress = (timeSinceArrival - fadeStartDelay) / fadeDuration;
        fadeProgress = constrain(fadeProgress, 0, 1);
        alpha = 255 * (1 - fadeProgress);
        sizeFactor = 1 + fadeProgress;
      }
    }
    
    let dotColor;
    if (dot.targetX < width/2) {
      dotColor = lerpColor(color(255, 0, 0), color(255, 255, 0), map(dot.targetX, 100, width/2, 0, 1));
    } else {
      dotColor = lerpColor(color(255, 255, 0), color(0, 255, 0), map(dot.targetX, width/2, width-100, 0, 1));
    }
    
    fill(red(dotColor), green(dotColor), blue(dotColor), alpha);
    noStroke();
    ellipse(dot.x, dot.y, dotSize * sizeFactor, dotSize * sizeFactor);
  }
}

function drawScale() {
  let scaleHeight = 20;
  let scaleY = height - 70;
  let scaleStart = 100;
  let scaleEnd = width - 100;
  
  noStroke();
  for (let x = scaleStart; x < scaleEnd; x++) {
    let scaleColor;
    if (x < width/2) {
      scaleColor = lerpColor(color(255, 0, 0), color(255, 255, 0), map(x, scaleStart, width/2, 0, 1));
    } else {
      scaleColor = lerpColor(color(255, 255, 0), color(0, 255, 0), map(x, width/2, scaleEnd, 0, 1));
    }
    fill(scaleColor);
    rect(x, scaleY, 1, scaleHeight);
  }
  
  stroke(255);
  strokeWeight(1);
  fill(255);
  textAlign(CENTER);
  textSize(12);
  
  let sigmaPoints = [-3, -2, -1, 0, 1, 2, 3];
  for (let sigma of sigmaPoints) {
    let x = map(sigma, -3, 3, scaleStart, scaleEnd);
    line(x, scaleY, x, scaleY + scaleHeight);
    text(sigma, x, scaleY + scaleHeight + 15);
  }
  
  // Draw Portfolio Average
  let avgPos = map(portfolioAverageX, 100, width-100, scaleStart, scaleEnd);
  
  stroke(255);
  strokeWeight(1.5);
  let arrowBottom = scaleY + scaleHeight + 25;
  let arrowTop = scaleY + scaleHeight;
  
  line(avgPos, arrowBottom, avgPos, arrowTop);
  
  let headSize = 6;
  line(avgPos - headSize, arrowTop + headSize, avgPos, arrowTop);
  line(avgPos + headSize, arrowTop + headSize, avgPos, arrowTop);
  
  noStroke();
  fill(255);
  textAlign(CENTER);
  textSize(14);
  text("Portfolio Average", avgPos, arrowBottom + 15);
  
  if (showConnections && constellations.length > 0) {
    let constellation = constellations[0];
    let colorPos;
    let r = red(constellation.color);
    let g = green(constellation.color);
    
    if (r === 255) {
      colorPos = map(g, 0, 255, scaleStart, width/2);
    } else {
      colorPos = map(r, 255, 0, width/2, scaleEnd);
    }
    
    stroke(255);
    strokeWeight(1.5);
    line(colorPos, arrowBottom, colorPos, arrowTop);
    line(colorPos - headSize, arrowTop + headSize, colorPos, arrowTop);
    line(colorPos + headSize, arrowTop + headSize, colorPos, arrowTop);
    
    noStroke();
    fill(255);
    text("center of this risk", colorPos, arrowBottom + 7);
  }
}

function drawConnections() {
  let constellationTime = millis() - constellationStartTime;
  let glowIntensity = constrain(constellationTime / constellationFadeDuration, 0, 1);
  
  for (let constellation of constellations) {
    if (constellationStyle === "shape" || constellationStyle === "both") {
      // Draw constellation as shape
      noStroke();
      fill(red(constellation.color), green(constellation.color), 0, 30);
      
      beginShape();
      if (constellation.connections.length > 0) {
        let firstDot = constellation.connections[0].start;
        vertex(firstDot.x, firstDot.y);
        
        for (let connection of constellation.connections) {
          vertex(connection.end.x, connection.end.y);
        }
      }
      endShape(CLOSE);
    }
    
    if (constellationStyle === "line" || constellationStyle === "both") {
      // Draw constellation as line
      stroke(red(constellation.color), green(constellation.color), 0, connectionAlpha);
      strokeWeight(2);
      
      beginShape();
      noFill();
      
      if (constellation.connections.length > 0) {
        let firstDot = constellation.connections[0].start;
        curveVertex(firstDot.x, firstDot.y);
        curveVertex(firstDot.x, firstDot.y);
        
        for (let connection of constellation.connections) {
          curveVertex(connection.end.x, connection.end.y);
        }
        
        let lastDot = constellation.connections[constellation.connections.length - 1].end;
        curveVertex(lastDot.x, lastDot.y);
      }
      
      endShape();
    }
  }
}

function drawConstellationWidth() {
  if (!showConnections || constellations.length === 0) return;
  
  let constellation = constellations[0];
  if (constellation.connections.length === 0) return;
  
  // Find leftmost and rightmost x coordinates
  let leftmost = width;
  let rightmost = 0;
  
  constellation.dots.forEach(dot => {
    leftmost = min(leftmost, dot.x);
    rightmost = max(rightmost, dot.x);
  });
  
  // Calculate width as percentage of total width
  let constellationWidth = rightmost - leftmost;
  let widthPercentage = (constellationWidth / (width - 200)) * 100;
  
  // Calculate average of all widths
  let averageWidth = constellationWidths.reduce((a, b) => a + b, 0) / constellationWidths.length;
  
  // Display in upper right corner with larger font
  noStroke();
  fill(255);
  textAlign(RIGHT);
  textSize(24);
  text(`Constellation Width: ${widthPercentage.toFixed(1)}%`, width - 50, 50);
  textSize(18);
  text(`Average Width: ${averageWidth.toFixed(1)}%`, width - 50, 80);
}

function mousePressed() {
  if (mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
    running = false;
  }
}

function createConnections() {
  console.log("Starting createConnections");
  let constellation = new Constellation();
  
  // Filter for dots that have arrived at their targets and haven't been used
  let availableDots = dots.filter(dot => 
    dot.arrived && !usedDots.has(dot)
  );
  
  // Generate random width using normal distribution
  // Using Box-Muller transform for normal distribution
  let u1 = random();
  let u2 = random();
  let z = sqrt(-2 * log(u1)) * cos(TWO_PI * u2);
  
  // Convert z-score to width with mean=1/3 and sd=2/3
  let meanWidth = width * 0.33;  // 1/3 of width
  let sdWidth = width * 0.67;    // 2/3 of width
  let sectionWidth = constrain(meanWidth + (z * sdWidth), width * 0.2, width * 0.9);  // Minimum 20% of width
  
  // Ensure section stays within bounds
  let maxStart = width - 100 - sectionWidth;
  let sectionStart = constrain(random(100, maxStart), 100, maxStart);
  
  // Add bias correction to encourage more central/right sections
  if (random() < 0.5) {  // 50% chance to shift right
    sectionStart = constrain(random(width/2 - sectionWidth/2, maxStart), 100, maxStart);
  }
  
  let sectionEnd = sectionStart + sectionWidth;
  
  // Filter dots within our chosen section
  let sectionDots = availableDots.filter(dot => 
    dot.x >= sectionStart && dot.x <= sectionEnd
  );
  
  // Only proceed if we have enough dots
  if (sectionDots.length >= 30) {
    console.log("Found enough dots:", sectionDots.length);
    
    // Select first dot randomly from section
    let currentDot = random(sectionDots);
    let numDotsToConnect = 30;
    let minDistance = width / 15;  // Keep same minimum distance for wide spread
    
    // Create path through dots
    for (let i = 0; i < numDotsToConnect; i++) {
      constellation.dots.add(currentDot);
      usedDots.add(currentDot);
      
      if (i < numDotsToConnect - 1) {
        let nextDot = null;
        let candidateDots = [];
        
        // Find dots that are far enough away but still in our section
        for (let dot of sectionDots) {
          if (!constellation.dots.has(dot) && !usedDots.has(dot)) {
            let d = dist(currentDot.x, currentDot.y, dot.x, dot.y);
            if (d > minDistance) {
              candidateDots.push({dot: dot, distance: d});
            }
          }
        }
        
        // Sort by distance and pick randomly from eligible dots
        if (candidateDots.length > 0) {
          // Don't sort by distance - pick completely randomly to encourage wider spread
          nextDot = random(candidateDots).dot;
          
          // Store connections in constellation object
          constellation.connections.push({
            start: currentDot,
            end: nextDot
          });
          
          currentDot = nextDot;
        } else {
          // If no suitable dots found, end constellation early
          break;
        }
      }
    }
    
    // Calculate average color for this constellation
    let totalRed = 0;
    let totalGreen = 0;
    constellation.dots.forEach(dot => {
      let dotColor;
      if (dot.targetX < width/2) {
        dotColor = lerpColor(color(255, 0, 0), color(255, 255, 0), map(dot.targetX, 100, width/2, 0, 1));
      } else {
        dotColor = lerpColor(color(255, 255, 0), color(0, 255, 0), map(dot.targetX, width/2, width-100, 0, 1));
      }
      totalRed += red(dotColor);
      totalGreen += green(dotColor);
    });
    
    let avgRed = totalRed / constellation.dots.size;
    let avgGreen = totalGreen / constellation.dots.size;
    constellation.color = color(avgRed, avgGreen, 0);
    
    console.log("Created constellation with connections:", constellation.connections.length);
    
    // Calculate and store width
    let leftmost = width;
    let rightmost = 0;
    constellation.dots.forEach(dot => {
      leftmost = min(leftmost, dot.x);
      rightmost = max(rightmost, dot.x);
    });
    let constellationWidth = rightmost - leftmost;
    let widthPercentage = (constellationWidth / (width - 200)) * 100;
    constellationWidths.push(widthPercentage);
  } else {
    console.log("Not enough dots found:", sectionDots.length);
  }
  
  constellations.push(constellation);
  showConnections = true;
  constellationStartTime = millis();
}
