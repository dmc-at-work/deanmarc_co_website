Math.constrain = function(val, min, max) {
  return val < min ? min : (val > max ? max : val);
};

Math.degreesConstrain = function(deg) {
  deg = deg % (Math.PI * 2);
  while (deg < 0) deg += Math.PI * 2;
  return deg;
};

Math.degreesBetween = function(a1, a2) {
  var deg = Math.degreesConstrain(a2 - a1);
  if (deg > Math.PI) return -((Math.PI * 2) - deg);
  return deg
};

/**
 * Bird
 */
function Bird(world, pos, angle, loner) {
  this.pos = pos;
  this.vel = {x : 0, y : 0};
  this.angle = angle;
  this.world = world;
  this.loner = !!(loner);
  this.friends = 0;
  if (this.loner) {
    this.speed = 0.6
  } else if (Math.random() < World.REVERSECHANCE) {
    this.speed = -(1 + Math.random() * 0.2);
  } else {
    this.speed = 1 + Math.random() * 0.2;
  }
}

Bird.prototype.update = function() {
  this.flock();

  // Calculate new velocity and update position.
  this.vel.x = Math.cos(this.angle) * this.speed;
  this.vel.y = Math.sin(this.angle) * this.speed;
  this.pos.x += this.vel.x;
  this.pos.y += this.vel.y;
  
  this.wrap();
};

Bird.prototype.applyFlow = function() {
  var xf = this.pos.x / World.FLOWSIZE;
  var xi = parseInt(xf);
  var xeffect = xf - xi;
  
  var yf = this.pos.y / World.FLOWSIZE;
  var yi = parseInt(yf);
  var yeffect = yf - yi;

  if (xi < 0 || yi < 0) {
    this.pos.x += this.vel.x;
    this.pos.y += this.vel.y;
    this.wrap();
    return;
  }

  var f00 = (1 - xeffect) * (1 - yeffect);
  var f01 = (1 - xeffect) * yeffect;
  var f10 = xeffect * (1 - yeffect);
  var f11 = xeffect * yeffect;

  var x = 0;
  var y = 0;
  var count = 0;

  x += this.world.flowField[xi][yi].x * f00;
  y += this.world.flowField[xi][yi].y * f00;
  count += this.world.flowField[xi][yi].count * f00;

  x += this.world.flowField[xi+1][yi].x * f10;
  y += this.world.flowField[xi+1][yi].y * f10;
  count += this.world.flowField[xi+1][yi].count * f10;

  x += this.world.flowField[xi][yi+1].x * f01;
  y += this.world.flowField[xi][yi+1].y * f01;
  count += this.world.flowField[xi][yi+1].count * f01;

  x += this.world.flowField[xi+1][yi+1].x * f11;
  y += this.world.flowField[xi+1][yi+1].y * f11;
  count += this.world.flowField[xi+1][yi+1].count * f11;

  if (count > 0) {
    this.angle += Math.degreesBetween(this.angle, Math.atan2(y, x)) * World.FLOWEFFECT * (count / World.FLOWCOUNT);
  }

  // Apply more jitter if we have too many friends nearby, or not enough.
  this.angle += (Math.random() * World.FLOWJITTER - World.FLOWJITTER / 2) * (1 - (count / World.FLOWCOUNT));

  // Calculate new velocity and update position.
  this.vel.x = Math.cos(this.angle) * this.speed;
  this.vel.y = Math.sin(this.angle) * this.speed;

  this.pos.x += this.vel.x * World.FLOWSPEEDUP;
  this.pos.y += this.vel.y * World.FLOWSPEEDUP;

  this.wrap();
  this.friends = 3 * count + 2;// (this.friends + count / 20) * 0.95;

  // Add ourself to the world's drawbucket for the number of friends we have.
  this.world.drawBuckets[Math.constrain(parseInt(this.friends), 0, World.MAXFRIENDS)].push(this);
};

Bird.prototype.flock = function() {
  if (this.loner) {
    this.angle -= Math.random() * World.STIRSTRENGTH;
    return;
  }

  var newfriends = 0;
  var others = this.world.getQuad(this.pos.x, this.pos.y);

  var start = parseInt(Math.random() * others.length);
  var end = Math.min(others.length, World.MAXCOMPARE);
  for (var i = 0; i < end; i++) {
    var other = others[(start + i) % others.length];
    if (other == this || other.speed < 0) continue;

    var xdiff = this.pos.x - other.pos.x;
    var ydiff = this.pos.y - other.pos.y;

    // Skip the sqrt and compensate in our other calcs.
    var dist = Math.pow(xdiff, 2) + Math.pow(ydiff, 2);
    if (dist > World.INFLUENCERANGESQ) continue;

    var effect = 1 - (dist / World.INFLUENCERANGESQ);

    if (other.loner) {
      this.angle += World.STIRSTRENGTH * effect;
    } else if (dist < World.SEPARATIONRANGESQ && this.speed > 0) {
      // Angle away from the object (make sure xdiff and ydiff subtract in the right direction).
      var angle_to = Math.atan2(ydiff, xdiff);

      // Turn away from things that are too close.
      this.angle += Math.degreesBetween(this.angle, angle_to) * World.SEPARATIONSTRENGTH;
    } else {
      // Turn in the same direction as object.
      this.angle += Math.degreesBetween(this.angle, other.angle) * World.INFLUENCESTRENGTH * effect;
    }
    if (dist < World.COLORRANGESQ) {
      newfriends++;
    }
  }
  this.friends = Math.round((this.friends + newfriends) / 2);

  // Add ourself to the world's drawbucket for the number of friends we have.
  this.world.drawBuckets[Math.constrain(this.friends, 0, World.MAXFRIENDS)].push(this);
};

Bird.prototype.wrap = function() {
  if (this.pos.x > this.world.width + 5 && this.vel.x > 0)
    this.pos.x -= (this.world.width + 10);
  else if (this.pos.x < -5 && this.vel.x < 0)
    this.pos.x += (this.world.width + 10);

  if (this.pos.y > this.world.height + 5 && this.vel.y > 0)
    this.pos.y -= (this.world.height + 10);
  else if (this.pos.y < -5 && this.vel.y < 0)
    this.pos.y += (this.world.height + 10);
};

Bird.prototype.draw = function() {
  // This is faster than save/translate/rotate/line/restore.
  this.world.ctx.moveTo(this.pos.x, this.pos.y);
  var len = World.DRAWLENGTH;
  this.world.ctx.lineTo(this.pos.x - this.vel.x * len,
                        this.pos.y - this.vel.y * len);
};

/**
 * World
 */
function World() {
  this.canvas = document.createElement('canvas');
  this.frame = 0;
  this.width = 960;
  /*this.height = 480;*/
  this.height = 720;
  this.canvas.width = this.width;
  this.canvas.height = this.height;
  this.ctx = this.canvas.getContext("2d");
  this.ctx.strokeStyle = '#fff';
  this.ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
  document.body.appendChild(this.canvas);

  this.birds = [];


  // init birdquads.
  this.birdquads = [];
  for (var x = 0; x <= this.width / World.QUADSIZE; x++) {
    this.birdquads[x] = [];
    for (var y = 0; y <= this.height / World.QUADSIZE; y++) {
      this.birdquads[x][y] = [];
    }
  }
  

  this.drawBuckets = [];

  // init flowfield.
  this.flowField = [];
  for (var x = 0; x <= this.width / World.FLOWSIZE + 2; x++) {
    this.flowField[x] = [];
    for (var y = 0; y <= this.height / World.FLOWSIZE + 2; y++) {
      this.flowField[x][y] = {
        x : 0,
        y : 0,
        count : 0
      };
    }
  }

  for (var i = 0; i < World.STARTBIRDS; i++) {
    this.addBird();
  }
  this.tick();
}


/*
World.INFLUENCERANGE = 30;
World.INFLUENCERANGESQ = Math.pow(World.INFLUENCERANGE, 2);
World.INFLUENCESTRENGTH = 0.007;
World.QUADSIZE = 20;
World.SEPARATIONRANGESQ = Math.pow(6, 2);
World.SEPARATIONSTRENGTH = 0.07;
World.CHOSENFEW = 1000;
*/
World.INFLUENCERANGE = 30;
World.INFLUENCERANGESQ = Math.pow(World.INFLUENCERANGE, 2);
World.INFLUENCESTRENGTH = 0.01;
World.QUADSIZE = 20;
World.SEPARATIONRANGESQ = Math.pow(15, 2);
World.SEPARATIONSTRENGTH = 0.01;
World.CHOSENFEW = 1000;

World.COLORRANGESQ = Math.pow(23, 2);
World.STARTBIRDS = 10000;
World.STIRSTRENGTH = -0.2;
World.STIRFREQ = 50;
World.MAXFRIENDS = 20;
World.COLORRATIO = 20;
World.MAXCOMPARE = 80;

World.FLOWSIZE = 20;
World.FLOWEFFECT = 0.06;
World.FLOWCOUNT = 2;
World.FLOWJITTER = 0.2;
World.FLOWSPEEDUP = 1.75;

World.DRAWLENGTH = 4;
World.REVERSECHANCE = 0.1;

World.prototype.addBird = function() {
  var pos = {
    x : Math.random() * this.width,
    y : Math.random() * this.height
  };
  var angle = Math.random() * Math.PI * 2;                
  this.birds.push(new Bird(this, pos, angle, (this.birds.length % World.STIRFREQ == 0)));
};

World.prototype.removeBird = function() {
  this.birds.pop();
};

World.prototype.generateQuads = function() {
  for (var x = 0; x <= this.width / World.QUADSIZE; x++) {
    for (var y = 0; y <= this.height / World.QUADSIZE; y++) {
      this.birdquads[x][y] = [];
    }
  }

  var offset = World.INFLUENCERANGE;// + World.QUADSIZE;
  for (var i = 0; i < World.CHOSENFEW; i++) {
    var bird = this.birds[i];
    var min_x = parseInt(Math.constrain((bird.pos.x - offset) / World.QUADSIZE, 0, this.width / World.QUADSIZE));
    var max_x = parseInt(Math.constrain((bird.pos.x + offset) / World.QUADSIZE, 0, this.width / World.QUADSIZE));
    var min_y = parseInt(Math.constrain((bird.pos.y - offset) / World.QUADSIZE, 0, this.height / World.QUADSIZE));
    var max_y = parseInt(Math.constrain((bird.pos.y + offset) / World.QUADSIZE, 0, this.height / World.QUADSIZE));

    for (var x = min_x; x <= max_x; x++) {
      for (var y = min_y; y <= max_y; y++) {
        this.birdquads[x][y].push(bird);
      }
    }
  }
};

World.prototype.generateFlows = function() {
  for (var x = 0; x <= this.width / World.FLOWSIZE + 2; x++) {
    for (var y = 0; y <= this.height / World.FLOWSIZE + 2; y++) {
      var f = this.flowField[x][y];
      this.flowField[x][y] = {
        x : f.x/6,
        y : f.y/6,
        count : 0
      };
    }
  }

  // Generate flowfield.
  for (var i = 0; i < World.CHOSENFEW; i++) {
    var bird = this.birds[i];
    
    var xf = bird.pos.x / World.FLOWSIZE;
    var xi = parseInt(xf);
    var xeffect = xf - xi;


    var yf = bird.pos.y / World.FLOWSIZE;
    var yi = parseInt(yf);
    var yeffect = yf - yi;

    // I should just stop this happening in the first place.
    if (xi < 0 || yi < 0 || xi >= this.flowField.length || yi >= this.flowField[0].length) continue;

    var f00 = (1 - xeffect) * (1 - yeffect);
    var f01 = (1 - xeffect) * yeffect;
    var f10 = xeffect * (1 - yeffect);
    var f11 = xeffect * yeffect;

    this.flowField[xi][yi].x += f00 * bird.vel.x;
    this.flowField[xi][yi].y += f00 * bird.vel.y;
    this.flowField[xi][yi].count += f00;

    this.flowField[xi+1][yi].x += f10 * bird.vel.x;
    this.flowField[xi+1][yi].y += f10 * bird.vel.y;
    this.flowField[xi+1][yi].count += f10;

    this.flowField[xi][yi+1].x += f01 * bird.vel.x;
    this.flowField[xi][yi+1].y += f01 * bird.vel.y;
    this.flowField[xi][yi+1].count += f01;

    this.flowField[xi+1][yi+1].x += f11 * bird.vel.x;
    this.flowField[xi+1][yi+1].y += f11 * bird.vel.y;
    this.flowField[xi+1][yi+1].count += f11;
  }

  // Average flowfield.
  for (var x = 0; x <= this.width / World.FLOWSIZE + 2; x++) {
    for (var y = 0; y <= this.height / World.FLOWSIZE + 2; y++) {

      if (this.flowField[x][y].count == 0) continue;
      this.flowField[x][y].x /= this.flowField[x][y].count;
      this.flowField[x][y].y /= this.flowField[x][y].count;
    }
  }
};

World.prototype.getQuad = function(x, y) {
  x = Math.constrain(x, 0, this.width);
  y = Math.constrain(y, 0, this.height);
  return this.birdquads[parseInt(x / World.QUADSIZE)][parseInt(y / World.QUADSIZE)];
};

World.prototype.tick = function() {
  this.frame++;
  if ((this.frame % 25) == 0) {
    if (this.start) {
      var framerate = (1000 / ((new Date() - this.start) / 25));
      document.getElementById('framerate').innerHTML = parseInt(framerate);
    }
    this.start = new Date();
  }
  //this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

  // It's significantly faster to batch strokes, but we need to draw the birds with different colors, so we group
  // the birds by the colors, then draw by color.
  this.drawBuckets = [];
  for (var i = 0; i <= World.MAXFRIENDS; i++) {
    this.drawBuckets[i] = [];
  }

  this.generateQuads();

  for (var i = 0; i < World.CHOSENFEW; i++) {
    this.birds[i].update();
  }

  this.generateFlows();
  for (var i = World.CHOSENFEW; i < this.birds.length; i++) {
    this.birds[i].applyFlow();
  }

  // Ignore birds with no friends.
  for (var i = 1; i <= World.MAXFRIENDS; i++) {
    var color = i / World.COLORRATIO;
    this.ctx.beginPath();
    this.ctx.strokeStyle = 'rgba(255, 255, 255, '+color+')';
    for (var u = 0, bird; bird = this.drawBuckets[i][u]; u++) {
      bird.draw();
    }
    this.ctx.stroke();
  }

  // Draw flowfield (debugging).
  /*
  this.ctx.beginPath();
  this.ctx.strokeStyle = 'rgba(255, 0, 0, 1)';
  for (var x = 0; x < this.width / World.FLOWSIZE; x++) {
    for (var y = 0; y < this.height / World.FLOWSIZE; y++) {
      var f = this.flowField[x][y];
      if (f.count > 0) {
        this.ctx.moveTo(x * World.FLOWSIZE, y * World.FLOWSIZE);
        var angle = Math.atan2(f.y, f.x);
        this.ctx.lineTo(x * World.FLOWSIZE + Math.cos(angle) * f.count * 5, y * World.FLOWSIZE + Math.sin(angle) * f.count * 5);
      }
    }
  }
  this.ctx.stroke();
  */

  var self = this;
  var f = function() {
    self.tick();
  }
  if (window.webkitRequestAnimationFrame) {
    window.webkitRequestAnimationFrame(f);
  } else if (window.mozRequestAnimationFrame) {
    window.mozRequestAnimationFrame(f);
  } else {
    setTimeout(function() {self.tick()}, 1);
  }
};