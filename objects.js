// Kite class
class Kite {
    constructor(x, y, playerNumber, name = `Player ${playerNumber}`) {
        this.x = x;
        this.y = y;
        this.playerNumber = playerNumber;
        this.name = name;
        this.velocityX = 0;
        this.velocityY = 0;
        this.health = 100;
        this.width = 40;
        this.height = 40;
        this.dashCooldown = false;
        this.defenseCooldown = false;
        this.activePowerUps = {
            speed: 0,
            shield: 0,
            windMaster: 0
        };
        this.anchorX = x;
        this.anchorY = y + 200;
        this.stringType = 'normal';
        this.dashActive = false;
        this.defenseActive = false;
        this.sparkleTimer = 0;
        this.lastDamageTime = 0;
        this.rotation = 0;
        this.trail = [];
        this.maxTrailLength = 10;
    }

    update(keys) {
        // Player controls
        const speed = this.activePowerUps.speed > 0 ? 0.5 : 0.3;
        
        if (this.playerNumber === 1) {
            // Player 1 controls (WASD)
            if (keys['w']) this.velocityY -= speed;
            if (keys['s']) this.velocityY += speed;
            if (keys['a']) this.velocityX -= speed;
            if (keys['d']) this.velocityX += speed;
            
            // Dash ability
            if (keys[' ']) this.dash();
            
            // Defense ability
            if (keys['shift']) this.activateDefense();
        } else if (this.playerNumber === 2) {
            // Player 2 controls (Arrow keys)
            if (keys['arrowup']) this.velocityY -= speed;
            if (keys['arrowdown']) this.velocityY += speed;
            if (keys['arrowleft']) this.velocityX -= speed;
            if (keys['arrowright']) this.velocityX += speed;
            
            // Dash ability
            if (keys['enter']) this.dash();
            
            // Defense ability
            if (keys['control']) this.activateDefense();
        }
        
        // Apply physics
        this.velocityX *= AIR_RESISTANCE;
        this.velocityY *= AIR_RESISTANCE;
        this.velocityY += GRAVITY; // Apply gravity
        
        // Update position
        this.x += this.velocityX;
        this.y += this.velocityY;
        
        // Check wind influence
        if (windPatterns) {
            this.applyWindInfluence();
        }
        
        // Keep within boundaries
        this.x = Math.max(this.width/2, Math.min(canvas.width - this.width/2, this.x));
        this.y = Math.max(this.height/2, Math.min(canvas.height - this.height/2, this.y));
        
        // Check for power-up collisions
        this.checkPowerUpCollisions();
        
        // Update power-up timers
        if (this.activePowerUps.speed > 0) this.activePowerUps.speed -= 1;
        if (this.activePowerUps.shield > 0) this.activePowerUps.shield -= 1;
        if (this.activePowerUps.windMaster > 0) this.activePowerUps.windMaster -= 1;

        // Store previous position for trail
        this.trail.unshift({ x: this.x, y: this.y });
        if (this.trail.length > this.maxTrailLength) {
            this.trail.pop();
        }

        // Update anchor point with smooth follow
        const anchorSpeed = 0.1;
        this.anchorX += (this.x - this.anchorX) * anchorSpeed;
        this.anchorY += ((this.y + 200) - this.anchorY) * anchorSpeed;

        // Update sparkle timer
        this.sparkleTimer = (this.sparkleTimer + 1) % 30;
    }

    applyWindInfluence() {
        windPatterns.forEach(wind => {
            const dx = this.x - wind.x;
            const dy = this.y - wind.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < wind.radius) {
                // Calculate wind strength based on distance from center
                const strength = (1 - distance / wind.radius) * wind.force;
                
                // Apply wind effect (reduced if wind master power-up is active)
                const influence = this.activePowerUps.windMaster > 0 ? 0.3 : 1;
                
                // Push kite outwards from wind center
                const angle = Math.atan2(dy, dx);
                this.velocityX += Math.cos(angle) * strength * influence;
                this.velocityY += Math.sin(angle) * strength * influence;
            }
        });
    }

    dash() {
        // Only dash if not recently used
        if (!this.dashCooldown) {
            // Add a burst of speed in the current direction
            const dashForce = 5;
            const angle = Math.atan2(this.velocityY, this.velocityX) || 0;
            this.velocityX += Math.cos(angle) * dashForce;
            this.velocityY += Math.sin(angle) * dashForce;
            
            // Create dash particles
            for (let i = 0; i < 10; i++) {
                createParticle(this.x, this.y, -Math.cos(angle) * 3, -Math.sin(angle) * 3, 
                            this.playerNumber === 1 ? '#ff0000' : '#0000ff', 1);
            }
            
            // Set cooldown
            this.dashCooldown = true;
            setTimeout(() => { this.dashCooldown = false; }, 2000);
        }
    }

    activateDefense() {
        // Only activate if not already active and not on cooldown
        if (!this.defenseCooldown && !this.activePowerUps.shield) {
            this.activePowerUps.shield = 300; // 5 seconds (60 frames * 5)
            
            // Create shield particles
            for (let i = 0; i < 20; i++) {
                const angle = (i / 20) * Math.PI * 2;
                createParticle(
                    this.x + Math.cos(angle) * this.width,
                    this.y + Math.sin(angle) * this.width,
                    Math.cos(angle) * 2,
                    Math.sin(angle) * 2,
                    this.playerNumber === 1 ? '#ff9999' : '#9999ff',
                    1.5
                );
            }
            
            // Set cooldown
            this.defenseCooldown = true;
            setTimeout(() => { this.defenseCooldown = false; }, 3000);
        }
    }

    takeDamage(amount) {
        // Prevent rapid damage (cooldown of 500ms)
        const now = Date.now();
        if (now - this.lastDamageTime < 500) {
            return false;
        }
        this.lastDamageTime = now;
        
        // No damage if shield is active
        if (this.activePowerUps.shield > 0) {
            // Shield particles
            for (let i = 0; i < 10; i++) {
                const angle = Math.random() * Math.PI * 2;
                createParticle(
                    this.x + Math.cos(angle) * this.width,
                    this.y + Math.sin(angle) * this.width,
                    Math.cos(angle) * 3,
                    Math.sin(angle) * 3,
                    '#00BFFF',
                    1
                );
            }
            console.log(`Player ${this.playerNumber} blocked damage with shield!`);
            return false;
        }
        
        // Reduce health (ensuring a minimum damage value)
        const actualDamage = Math.max(5, Math.ceil(amount));
        this.health = Math.max(0, this.health - actualDamage);
        console.log(`Player ${this.playerNumber} took ${actualDamage} damage! Health: ${this.health}`);
        
        // Create damage particles - more particles for more damage
        const particleCount = Math.min(30, actualDamage);
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 3;
            createParticle(
                this.x,
                this.y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                this.playerNumber === 1 ? '#FF5252' : '#2196F3',
                1
            );
        }
        
        return true;
    }

    checkPowerUpCollisions() {
        powerUps.forEach((powerUp, index) => {
            const dx = this.x - powerUp.x;
            const dy = this.y - powerUp.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < this.width + powerUp.radius) {
                // Collect power-up
                this.collectPowerUp(powerUp.type);
                powerUp.collected = true;
                
                // Create collection particles
                for (let i = 0; i < 15; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 1 + Math.random() * 2;
                    let color;
                    
                    switch(powerUp.type) {
                        case 'speed': color = '#FFD700'; break;
                        case 'shield': color = '#00BFFF'; break;
                        case 'repair': color = '#32CD32'; break;
                        case 'windMaster': color = '#9932CC'; break;
                    }
                    
                    createParticle(
                        powerUp.x,
                        powerUp.y,
                        Math.cos(angle) * speed,
                        Math.sin(angle) * speed,
                        color,
                        1
                    );
                }
            }
        });
    }

    collectPowerUp(type) {
        console.log(`Player ${this.playerNumber} collected ${type} power-up`);
        
        switch(type) {
            case 'speed':
                this.activePowerUps.speed = 300; // 5 seconds
                break;
            case 'shield':
                this.activePowerUps.shield = 600; // 10 seconds
                break;
            case 'repair':
                this.health = Math.min(100, this.health + 30);
                break;
            case 'windMaster':
                this.activePowerUps.windMaster = 480; // 8 seconds
                break;
        }
    }

    checkCollision(otherKite) {
        const dx = this.x - otherKite.x;
        const dy = this.y - otherKite.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Collision detected - record last collision time to prevent rapid collisions
        const now = Date.now();
        const timeSinceLastCollision = now - this.lastDamageTime;
        if (timeSinceLastCollision < 500) {
            return false;
        }
        
        // Simple collision detection between kites
        if (distance < this.width + otherKite.width) {
            // Calculate collision force
            const force = 10;
            
            // Push kites away from each other
            const angle = Math.atan2(dy, dx);
            this.velocityX += Math.cos(angle) * force;
            this.velocityY += Math.sin(angle) * force;
            otherKite.velocityX -= Math.cos(angle) * force;
            otherKite.velocityY -= Math.sin(angle) * force;
            
            // Calculate damage based on relative speed
            const relativeSpeedX = this.velocityX - otherKite.velocityX;
            const relativeSpeedY = this.velocityY - otherKite.velocityY;
            const relativeSpeed = Math.sqrt(relativeSpeedX * relativeSpeedX + relativeSpeedY * relativeSpeedY);
            
            // Damage is based on relative speed and distance
            const impactRatio = 1 - distance / (this.width + otherKite.width);
            const damage = Math.min(30, 10 + relativeSpeed * 10) * impactRatio;
            
            // Apply damage to both kites
            this.takeDamage(damage);
            otherKite.takeDamage(damage);
            
            // Create collision particles
            for (let i = 0; i < 20; i++) {
                const particleAngle = Math.random() * Math.PI * 2;
                createParticle(
                    this.x + dx / 2,
                    this.y + dy / 2,
                    Math.cos(particleAngle) * 3,
                    Math.sin(particleAngle) * 3,
                    '#FFFFFF',
                    1
                );
            }
            
            return true;
        }
        
        // String collision detection
        const thisString = {
            x1: this.x, y1: this.y,
            x2: this.x, y2: canvas.height - 20
        };
        
        const otherString = {
            x1: otherKite.x, y1: otherKite.y,
            x2: otherKite.x, y2: canvas.height - 20
        };
        
        // Check if strings intersect
        if (lineIntersection(thisString, otherString)) {
            const intersection = getLineIntersection(thisString, otherString);
            if (intersection) {
                // Calculate damage based on relative speed
                const relativeSpeed = Math.sqrt(
                    Math.pow(this.velocityX - otherKite.velocityX, 2) +
                    Math.pow(this.velocityY - otherKite.velocityY, 2)
                );
                
                const stringDamage = 10 + relativeSpeed * 5;
                
                // Apply damage to both kites
                this.takeDamage(stringDamage);
                otherKite.takeDamage(stringDamage);
                
                // Create string collision particles
                for (let i = 0; i < 15; i++) {
                    createParticle(
                        intersection.x,
                        intersection.y,
                        (Math.random() - 0.5) * 3,
                        (Math.random() - 0.5) * 3,
                        '#FFFF00',
                        1
                    );
                }
                
                return true;
            }
        }
        
        return false;
    }

    draw(ctx) {
        // Draw trail
        if (this.dashActive || this.activePowerUps.speed > 0) {
            ctx.beginPath();
            ctx.moveTo(this.trail[0].x, this.trail[0].y);
            for (let i = 1; i < this.trail.length; i++) {
                ctx.lineTo(this.trail[i].x, this.trail[i].y);
            }
            ctx.strokeStyle = this.playerNumber === 1 ? 
                'rgba(255, 82, 82, 0.3)' : 'rgba(33, 150, 243, 0.3)';
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        // Draw kite string (more vibrant and visible)
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        
        // Create a curved string that hangs down
        const controlPoint1X = this.x;
        const controlPoint1Y = this.y + 100;
        const controlPoint2X = this.x;
        const controlPoint2Y = canvas.height - 100;
        const endPointX = this.x;
        const endPointY = canvas.height - 20;
        
        ctx.bezierCurveTo(
            controlPoint1X, controlPoint1Y,
            controlPoint2X, controlPoint2Y,
            endPointX, endPointY
        );
        
        // Make string more visible
        let stringColor;
        if (this.activePowerUps.shield > 0) {
            stringColor = '#00BFFF';
        } else if (this.playerNumber === 1) {
            stringColor = '#FF0000';  // Brighter red
        } else {
            stringColor = '#0000FF';  // Brighter blue
        }
        
        ctx.strokeStyle = stringColor;
        ctx.lineWidth = 3;  // Thicker line
        ctx.stroke();
        
        // Draw kite - improved diamond shape with bowed sides
        const kiteColor = this.playerNumber === 1 ? '#FF5252' : '#2196F3';
        const kiteBorderColor = this.playerNumber === 1 ? '#AA0000' : '#0055AA';
        const kiteAccentColor = this.playerNumber === 1 ? '#FFCCCC' : '#BBDDFF';
        
        // Main kite body
        ctx.beginPath();
        
        // Top point
        ctx.moveTo(this.x, this.y - this.height/2);
        
        // Right curve (bowed outward)
        ctx.quadraticCurveTo(
            this.x + this.width/3, this.y - this.height/6,
            this.x + this.width/2, this.y
        );
        
        // Bottom curve (bowed outward)
        ctx.quadraticCurveTo(
            this.x + this.width/3, this.y + this.height/6,
            this.x, this.y + this.height/2
        );
        
        // Left curve (bowed outward)
        ctx.quadraticCurveTo(
            this.x - this.width/3, this.y + this.height/6,
            this.x - this.width/2, this.y
        );
        
        // Back to top (bowed outward)
        ctx.quadraticCurveTo(
            this.x - this.width/3, this.y - this.height/6,
            this.x, this.y - this.height/2
        );
        
        ctx.closePath();
        ctx.fillStyle = kiteColor;
        ctx.fill();
        
        // Kite border
        ctx.strokeStyle = kiteBorderColor;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Cross supports on kite
        ctx.beginPath();
        ctx.moveTo(this.x - this.width/2, this.y);
        ctx.lineTo(this.x + this.width/2, this.y);
        ctx.moveTo(this.x, this.y - this.height/2);
        ctx.lineTo(this.x, this.y + this.height/2);
        ctx.strokeStyle = kiteAccentColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        // Center circle
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.width/8, 0, Math.PI * 2);
        ctx.fillStyle = kiteAccentColor;
        ctx.fill();
        ctx.strokeStyle = kiteBorderColor;
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Kite tail
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + this.height/2);
        
        // Create a wavy tail
        for (let i = 1; i <= 6; i++) {
            const offsetX = (i % 2 === 0) ? 5 : -5;
            ctx.lineTo(this.x + offsetX, this.y + this.height/2 + i * 8);
        }
        
        ctx.strokeStyle = kiteAccentColor;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw shield if active
        if (this.activePowerUps.shield > 0) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.width * 1.5, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(0, 191, 255, 0.7)';
            ctx.lineWidth = 3;
            ctx.stroke();
        }
        
        // Draw speed effect if active
        if (this.activePowerUps.speed > 0) {
            ctx.beginPath();
            ctx.moveTo(this.x - this.width, this.y);
            ctx.lineTo(this.x - this.width * 2, this.y - this.height/3);
            ctx.lineTo(this.x - this.width * 2, this.y + this.height/3);
            ctx.closePath();
            ctx.fillStyle = 'rgba(255, 215, 0, 0.7)';
            ctx.fill();
        }

        // Draw health bar
        this.drawHealthBar(ctx);

        // Draw name above kite
        this.drawPlayerName(ctx);

        // Draw special effects
        if (this.dashActive) {
            this.drawDashEffect(ctx);
        }
        
        if (this.defenseActive) {
            this.drawDefenseEffect(ctx);
        }
    }

    drawPlayerName(ctx) {
        ctx.save();
        
        // Determine text position
        const yPosition = this.y - this.height - 15;
        
        // Create background for better visibility
        const nameWidth = ctx.measureText(this.name).width + 10;
        const nameHeight = 20;
        const bgColor = this.playerNumber === 1 ? 'rgba(255, 0, 0, 0.6)' : 'rgba(0, 0, 255, 0.6)';
        
        // Draw background pill shape
        ctx.fillStyle = bgColor;
        ctx.beginPath();
        ctx.ellipse(this.x, yPosition, nameWidth/2 + 5, nameHeight/2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw name text with bold font
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Text shadow for better contrast
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillText(this.name, this.x + 1, yPosition + 1);
        
        // Main text
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(this.name, this.x, yPosition);
        
        ctx.restore();
    }

    drawHealthBar(ctx) {
        const barWidth = 40;
        const barHeight = 5;
        const x = this.x - barWidth/2;
        const y = this.y - 30;
        
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // Health level
        let healthColor;
        if (this.health > 60) healthColor = '#4CAF50';
        else if (this.health > 30) healthColor = '#FFC107';
        else healthColor = '#F44336';
        
        ctx.fillStyle = healthColor;
        ctx.fillRect(x, y, barWidth * (this.health/100), barHeight);
        
        // Border
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, barWidth, barHeight);
    }
}

// Create particle function
function createParticle(x, y, vx, vy, color, lifetime) {
    particles.push({
        x: x,
        y: y,
        velocityX: vx + (Math.random() * 2 - 1),
        velocityY: vy + (Math.random() * 2 - 1),
        size: 3 + Math.random() * 5,
        color: color,
        lifetime: lifetime || 1,
        alpha: 1,
        update: function(deltaTime) {
            this.x += this.velocityX;
            this.y += this.velocityY;
            this.velocityX *= 0.98;
            this.velocityY *= 0.98;
            this.size *= 0.95;
            this.lifetime -= deltaTime;
            this.alpha = Math.min(1, this.lifetime);
        },
        draw: function(ctx) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = this.color.replace(')', `, ${this.alpha})`).replace('rgb', 'rgba');
            ctx.fill();
        }
    });
}

// Particle class
class Particle {
    constructor(x, y, vx, vy, color, lifetime, isSparkle = false) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.lifetime = lifetime;
        this.maxLifetime = lifetime;
        this.isSparkle = isSparkle;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.lifetime--;
        
        if (!this.isSparkle) {
            this.vy += 0.05;
        }
        
        return this.lifetime > 0;
    }

    draw() {
        const alpha = this.lifetime / this.maxLifetime;
        const size = this.isSparkle ? 3 : 5;
        
        ctx.globalAlpha = alpha;
        
        if (this.isSparkle) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(Date.now() / 100);
            
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const angle = (i * Math.PI * 2) / 5;
                const innerRadius = size / 2;
                const outerRadius = size;
                
                if (i === 0) {
                    ctx.moveTo(Math.cos(angle) * outerRadius, Math.sin(angle) * outerRadius);
                } else {
                    ctx.lineTo(Math.cos(angle) * outerRadius, Math.sin(angle) * outerRadius);
                }
                
                const halfAngle = angle + Math.PI / 5;
                ctx.lineTo(Math.cos(halfAngle) * innerRadius, Math.sin(halfAngle) * innerRadius);
            }
            ctx.closePath();
            
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.restore();
        } else {
            ctx.beginPath();
            ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
        }
        
        ctx.globalAlpha = 1;
    }
}

// PowerUp class
class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.vy = -1;
        this.type = type;
        this.animation = 0;
        
        switch (type) {
            case 'speed':
                this.color = '#FFD700';
                break;
            case 'shield':
                this.color = '#00BFFF';
                break;
            case 'repair':
                this.color = '#4CAF50';
                break;
            case 'windMaster':
                this.color = '#9932CC';
                break;
            default:
                this.color = '#FFFFFF';
        }
    }

    update() {
        this.y += this.vy * 0.5;
        this.animation += 0.05;
        if (this.animation > Math.PI * 2) {
            this.animation = 0;
        }
        
        if (this.y < 50) {
            this.vy = 0.5;
        } else if (this.y > canvas.height - 100) {
            this.vy = -0.5;
        }
        
        this.x += Math.sin(this.animation) * 0.5;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, 20 + Math.sin(this.animation) * 5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${hexToRgb(this.color)}, 0.3)`;
        ctx.fill();
        
        ctx.save();
        ctx.translate(this.x, this.y);
        
        switch (this.type) {
            case 'speed':
                ctx.beginPath();
                ctx.moveTo(0, -10);
                ctx.lineTo(5, 0);
                ctx.lineTo(-2, 2);
                ctx.lineTo(0, 10);
                ctx.lineTo(-5, 0);
                ctx.lineTo(2, -2);
                ctx.closePath();
                break;
            case 'shield':
                ctx.beginPath();
                ctx.arc(0, 0, 8, 0, Math.PI * 2);
                ctx.moveTo(0, -4);
                ctx.lineTo(0, 4);
                ctx.moveTo(-4, 0);
                ctx.lineTo(4, 0);
                break;
            case 'repair':
                ctx.beginPath();
                ctx.moveTo(-8, 0);
                ctx.lineTo(8, 0);
                ctx.moveTo(0, -8);
                ctx.lineTo(0, 8);
                break;
            case 'windMaster':
                ctx.beginPath();
                for (let i = 0; i < Math.PI * 4; i += 0.5) {
                    const r = 8 * (1 - i / (Math.PI * 4));
                    const x = Math.cos(i) * r;
                    const y = Math.sin(i) * r;
                    if (i === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                }
                break;
        }
        
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;
        ctx.stroke();
        
        if (this.type !== 'shield') {
            ctx.fillStyle = this.color;
            ctx.fill();
        }
        
        ctx.restore();
    }
}

// Wind class
class Wind {
    constructor(x, y, radius, force) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.force = force;
        this.forceX = Math.cos(Math.random() * Math.PI * 2) * force;
        this.forceY = Math.sin(Math.random() * Math.PI * 2) * force;
        this.animation = 0;
    }

    update() {
        this.animation += 0.02;
        if (this.animation > Math.PI * 2) {
            this.animation = 0;
        }
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fill();
        
        const numIndicators = Math.floor(this.radius / 20);
        const angleStep = (Math.PI * 2) / numIndicators;
        
        for (let i = 0; i < numIndicators; i++) {
            const angle = i * angleStep + this.animation;
            const distance = this.radius * 0.3 + Math.sin(angle * 3) * this.radius * 0.2;
            const x = this.x + Math.cos(angle) * distance;
            const y = this.y + Math.sin(angle) * distance;
            
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(Math.atan2(this.forceY, this.forceX));
            
            ctx.beginPath();
            ctx.moveTo(-10, 0);
            ctx.lineTo(10, 0);
            ctx.lineTo(5, -5);
            ctx.moveTo(10, 0);
            ctx.lineTo(5, 5);
            
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            ctx.restore();
        }
    }
}

// Weather class
class Weather {
    constructor(type, intensity) {
        this.type = type;
        this.intensity = intensity;
        this.particles = [];
        this.createParticles();
    }

    createParticles() {
        const particleCount = this.intensity * 100;
        
        for (let i = 0; i < particleCount; i++) {
            if (this.type === 'rain') {
                this.particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    length: 10 + Math.random() * 10,
                    speed: 10 + Math.random() * 10
                });
            } else if (this.type === 'snow') {
                this.particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    size: 2 + Math.random() * 3,
                    speed: 1 + Math.random() * 2,
                    angle: Math.random() * Math.PI * 2,
                    spin: (Math.random() - 0.5) * 0.1
                });
            }
        }
    }

    update() {
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            
            if (this.type === 'rain') {
                p.y += p.speed;
                p.x -= p.speed * 0.2;
                
                if (p.y > canvas.height) {
                    p.y = -p.length;
                    p.x = Math.random() * canvas.width;
                }
            } else if (this.type === 'snow') {
                p.y += p.speed;
                p.x += Math.sin(p.angle) * 0.5;
                p.angle += p.spin;
                
                if (p.y > canvas.height) {
                    p.y = -p.size;
                    p.x = Math.random() * canvas.width;
                }
                
                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
            }
        }
    }

    draw() {
        if (this.type === 'rain') {
            ctx.strokeStyle = 'rgba(200, 220, 255, 0.6)';
            ctx.lineWidth = 1;
            
            for (const p of this.particles) {
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x - p.length * 0.2, p.y + p.length);
                ctx.stroke();
            }
        } else if (this.type === 'snow') {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            
            for (const p of this.particles) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
}

// Helper functions
function lineIntersection(line1, line2) {
    const denominator = ((line2.y2 - line2.y1) * (line1.x2 - line1.x1)) - ((line2.x2 - line2.x1) * (line1.y2 - line1.y1));
    
    if (denominator === 0) return false;
    
    const ua = (((line2.x2 - line2.x1) * (line1.y1 - line2.y1)) - ((line2.y2 - line2.y1) * (line1.x1 - line2.x1))) / denominator;
    const ub = (((line1.x2 - line1.x1) * (line1.y1 - line2.y1)) - ((line1.y2 - line1.y1) * (line1.x1 - line2.x1))) / denominator;
    
    return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
}

function getLineIntersection(line1, line2) {
    const denominator = ((line2.y2 - line2.y1) * (line1.x2 - line1.x1)) - ((line2.x2 - line2.x1) * (line1.y2 - line1.y1));
    
    if (denominator === 0) return null;
    
    const ua = (((line2.x2 - line2.x1) * (line1.y1 - line2.y1)) - ((line2.y2 - line2.y1) * (line1.x1 - line2.x1))) / denominator;
    const ub = (((line1.x2 - line1.x1) * (line1.y1 - line2.y1)) - ((line1.y2 - line1.y1) * (line1.x1 - line2.x1))) / denominator;
    
    if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
        const x = line1.x1 + (ua * (line1.x2 - line1.x1));
        const y = line1.y1 + (ua * (line1.y2 - line1.y1));
        return {x, y};
    }
    
    return null;
}

function hexToRgb(hex) {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `${r}, ${g}, ${b}`;
}

// Enemy class for endless mode
class Enemy {
    constructor(x, y, speed) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.speed = speed;
        this.health = 100;
        this.targetX = 0;
        this.targetY = 0;
        this.color = '#FF4444';
        this.lastDamageTime = 0;
    }
    
    update(playerKite) {
        // Calculate direction to player
        const dx = playerKite.x - this.x;
        const dy = playerKite.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Move towards player
        if (distance > 0) {
            this.x += (dx / distance) * this.speed;
            this.y += (dy / distance) * this.speed;
        }
        
        // Check collision with player
        if (this.checkCollision(playerKite)) {
            const currentTime = Date.now();
            if (currentTime - this.lastDamageTime > 1000) {
                playerKite.takeDamage(10);
                this.lastDamageTime = currentTime;
            }
        }
        
        // Return false if enemy should be removed
        return this.health > 0;
    }
    
    checkCollision(kite) {
        return (
            this.x < kite.x + kite.width &&
            this.x + this.width > kite.x &&
            this.y < kite.y + kite.height &&
            this.y + this.height > kite.y
        );
    }
    
    takeDamage(amount) {
        this.health -= amount;
        // Create damage particles
        for (let i = 0; i < 5; i++) {
            particles.push(new Particle(
                this.x + this.width / 2,
                this.y + this.height / 2,
                'damage'
            ));
        }
    }
    
    draw() {
        ctx.save();
        
        // Draw enemy kite
        ctx.fillStyle = this.color;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + this.width, this.y + this.height / 2);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.lineTo(this.x + this.width / 4, this.y + this.height / 2);
        ctx.closePath();
        
        ctx.fill();
        ctx.stroke();
        
        // Draw health bar
        const healthBarWidth = this.width;
        const healthBarHeight = 4;
        const healthBarY = this.y - 10;
        
        ctx.fillStyle = '#333';
        ctx.fillRect(this.x, healthBarY, healthBarWidth, healthBarHeight);
        
        ctx.fillStyle = '#FF4444';
        ctx.fillRect(this.x, healthBarY, healthBarWidth * (this.health / 100), healthBarHeight);
        
        ctx.restore();
    }
} 