let dots = [];
let histogramBins = [];
let binCount = 50;
let animationDuration = 6000; // 60 seconds for each animation
let pauseDuration = 5000;      // Changed to 5 seconds pause between runs
let startTime;
let numDots = 5000;
let iterationCount = 0;
let maxIterations = 5;
let isPaused = false;
let pauseStartTime;

function setup() {
  createCanvas(1200, 800);
  
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
  
  // Generate dots using Box-Muller transform for normal distribution
  for (let i = 0; i < numDots; i++) {
    let u1 = random();
    let u2 = random();
    let z = sqrt(-2 * log(u1)) * cos(TWO_PI * u2);
    // Scale and shift to fit canvas width
    let x = map(z, -3, 3, 100, width-100); // Add margins on sides
    // Find the current height of the stack at this x position
    let binIndex = floor(map(x, 0, width, 0, binCount));
    binIndex = constrain(binIndex, 0, binCount - 1);
    histogramBins[binIndex]++;
    
    dots.push({
      x: random(width), // Start position
      y: random(height), // Start position
      targetX: x,
      targetY: height - 100 - (histogramBins[binIndex] * 2), // Adjusted stacking height and bottom margin
      arrived: false
    });
  }
}

function draw() {
  background(0);
  
  let currentTime = millis() - startTime;
  
  if (isPaused) {
    // During pause, keep showing the final state of the last animation
    drawDots();
    drawScale();
    
    // Check if pause is over
    if (millis() - pauseStartTime >= pauseDuration) {
      isPaused = false;
      if (iterationCount < maxIterations) {
        resetAnimation();
      }
    }
  } else {
    // Normal animation
    drawDots();
    drawScale();
    
    // Check if current animation is complete
    if (currentTime >= animationDuration) {
      iterationCount++;
      if (iterationCount < maxIterations) {
        // Start pause
        isPaused = true;
        pauseStartTime = millis();
      }
    }
  }
}

function drawDots() {
  // Update and draw dots
  for (let dot of dots) {
    if (!dot.arrived && !isPaused) {
      // Move dots towards target
      dot.x = lerp(dot.x, dot.targetX, 0.05);
      dot.y = lerp(dot.y, dot.targetY, 0.05);
      
      // Check if dot has arrived
      if (dist(dot.x, dot.y, dot.targetX, dot.targetY) < 1) {
        dot.arrived = true;
      }
    }
    
    // Draw dot with color based on x position
    let dotColor;
    if (dot.targetX < width/2) {
      dotColor = lerpColor(color(255, 0, 0), color(255, 255, 0), map(dot.targetX, 100, width/2, 0, 1));
    } else {
      dotColor = lerpColor(color(255, 255, 0), color(0, 255, 0), map(dot.targetX, width/2, width-100, 0, 1));
    }
    fill(dotColor);
    noStroke();
    ellipse(dot.x, dot.y, 4, 4);
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
  
  // Draw tick marks and labels for -3σ, -2σ, -1σ, 0, 1σ, 2σ, 3σ
  let sigmaPoints = [-3, -2, -1, 0, 1, 2, 3];
  for (let sigma of sigmaPoints) {
    let x = map(sigma, -3, 3, scaleStart, scaleEnd);
    // Tick mark
    line(x, scaleY, x, scaleY + scaleHeight);
    // Label
    text(sigma + "σ", x, scaleY + scaleHeight + 15);
  }
}
