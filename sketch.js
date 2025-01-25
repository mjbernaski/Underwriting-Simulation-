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

// Add this class to organize constellation data
class Constellation {
  constructor() {
    this.dots = new Set();
    this.connections = [];
    this.color = null;
  }
}

function setup() {
  createCanvas(3200, 1700);
  
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
}

function draw() {
  background(0);
  
  let currentTime = millis() - startTime;
  
  if (isPaused) {
    // During pause, keep showing the final state of the last animation
    drawDots();
    drawScale();
    if (showConnections) {
      drawConnections();
    }
    
    // Check if pause is over - use slider value for duration
    if (millis() - pauseStartTime >= pauseDuration) {
      // Move to next histogram
      isPaused = false;
      currentConstellation = 0;
      showConnections = false;  // Make sure to clear connections
      constellations = [];     // Clear constellation array
      if (running) {
        resetAnimation();
      }
    }
  } else {
    // Normal animation
    drawDots();
    drawScale();
    
    // Check if current animation is complete
    if (currentTime >= animationDuration) {
      // Start first constellation
      isPaused = true;
      pauseStartTime = millis();
      currentConstellation = 0;
      constellations = [];    // Clear any existing constellations
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
      
      // Check if dot has arrived
      if (dist(dot.x, dot.y, dot.targetX, dot.targetY) < 1) {
        dot.arrived = true;
        dot.arrivalTime = currentTime;
      }
    }
    
    // Calculate opacity based on animation phase
    let alpha = 255;
    let sizeFactor = 1;
    
    if (showConnections) {
      // In constellation phase
      let constellationTime = currentTime - constellationStartTime;
      if (!dot.inConstellation) {
        // Fade to faint (20% opacity) instead of completely black
        let fadeProgress = constellationTime / constellationFadeDuration;
        alpha = lerp(255, 50, constrain(fadeProgress, 0, 1));
      } else {
        // Use larger size for constellation dots
        sizeFactor = 2;
      }
    } else if (dot.arrived) {
      // Normal fade behavior during main animation
      let timeSinceArrival = currentTime - dot.arrivalTime;
      if (timeSinceArrival > fadeStartDelay) {
        let fadeProgress = (timeSinceArrival - fadeStartDelay) / fadeDuration;
        fadeProgress = constrain(fadeProgress, 0, 1);
        alpha = 255 * (1 - fadeProgress);
        sizeFactor = 1 + fadeProgress;
      }
    }
    
    // Draw dot with color and size
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
  // Draw color scale bar at the bottom
  let scaleHeight = 20;
  let scaleY = height - 70;
  let scaleStart = 100;
  let scaleEnd = width - 100;
  
  // Draw the gradient bar
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
  
  // Add tick marks and labels
  stroke(255);
  strokeWeight(1);
  fill(255);
  textAlign(CENTER);
  textSize(12);
  
  // Draw tick marks and labels for -3, -2, -1, 0, 1, 2, 3
  let sigmaPoints = [-3, -2, -1, 0, 1, 2, 3];
  for (let sigma of sigmaPoints) {
    let x = map(sigma, -3, 3, scaleStart, scaleEnd);
    // Tick mark
    line(x, scaleY, x, scaleY + scaleHeight);
    // Label without σ symbol
    text(sigma, x, scaleY + scaleHeight + 15);
  }
  
  // Draw Portfolio Average arrow and label
  let avgPos = map(portfolioAverageX, 100, width-100, scaleStart, scaleEnd);
  
  // Draw arrow pointing up to scale bar
  stroke(255);
  strokeWeight(1.5);
  let arrowBottom = scaleY + scaleHeight + 25;
  let arrowTop = scaleY + scaleHeight;
  
  // Arrow stem
  line(avgPos, arrowBottom, avgPos, arrowTop);
  
  // Arrow head
  let headSize = 6;
  line(avgPos - headSize, arrowTop + headSize, avgPos, arrowTop);
  line(avgPos + headSize, arrowTop + headSize, avgPos, arrowTop);
  
  // Draw label
  noStroke();
  fill(255);
  textAlign(CENTER);
  textSize(14);
  text("Portfolio Average", avgPos, arrowBottom + 15);
  
  // Draw constellation composite arrow and label after to ensure it's on top
  if (showConnections && constellations.length > 0) {
    let constellation = constellations[0];
    
    // Calculate x position on scale based on color
    let colorPos;
    let r = red(constellation.color);
    let g = green(constellation.color);
    
    // Map the full red-yellow-green spectrum to the scale width
    if (r === 255) {  // Red to yellow range
      colorPos = map(g, 0, 255, scaleStart, width/2);
    } else {          // Yellow to green range
      colorPos = map(r, 255, 0, width/2, scaleEnd);
    }
    
    // Draw arrow pointing up to scale bar
    stroke(255);
    strokeWeight(1.5);
    let arrowBottom = scaleY + scaleHeight + 25;  // Position below the number labels
    let arrowTop = scaleY + scaleHeight;          // Point to bottom of scale bar
    
    // Arrow stem
    line(colorPos, arrowBottom, colorPos, arrowTop);
    
    // Arrow head
    let headSize = 6;
    line(colorPos - headSize, arrowTop + headSize, colorPos, arrowTop);
    line(colorPos + headSize, arrowTop + headSize, colorPos, arrowTop);
    
    // Draw label
    noStroke();
    fill(255);
    textAlign(CENTER);
    textSize(14);
    text("this risk", colorPos, arrowBottom + 15);
  }
}

function mousePressed() {
  if (mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
    running = false;
  }
}

function createConnections() {
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
    
    // Add constellation to array
    constellations.push(constellation);
    
    // Mark dots that are part of this constellation
    for (let dot of dots) {
      if (constellation.dots.has(dot)) {
        dot.inConstellation = true;
        dot.constellationSize = dotSize * 2;
      }
    }
  }
  
  showConnections = true;
  constellationStartTime = millis();
}

function drawConnections() {
  let constellationTime = millis() - constellationStartTime;
  let glowIntensity = constrain(constellationTime / constellationFadeDuration, 0, 1);
  
  // Draw each constellation
  for (let constellation of constellations) {
    // Draw multiple layers with increasing width for glow effect
    for (let layer = 3; layer >= 0; layer--) {
      let layerAlpha = connectionAlpha * (1 - layer/4) * (1 + glowIntensity);
      let layerWidth = (layer * 0.5 + 0.5) * (1 + glowIntensity);
      
      stroke(red(constellation.color), green(constellation.color), 0, layerAlpha);
      strokeWeight(layerWidth);
      
      // Draw as one continuous curved line
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
