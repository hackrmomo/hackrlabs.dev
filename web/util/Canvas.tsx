// adapted from https://medium.com/@pdx.lucasm/canvas-with-react-js-32e133c05258 for typescript
// inspired collision detection system from implementation in https://github.com/JBreidfjord/particle-sim

import React, { useRef, useEffect } from 'react'

const GRAVITY: number = 9.81;
const GRAVITY_MULTIPLIER: number = 0.05;
const RADIUS: number = 10;
const SPACING: number = 60;
const MAX_VELOCITY: number = 60;
const EXTERNAL_PADDING_PERCENT: number = 0.15;

interface ICanvasProps {
  style?: React.CSSProperties
}

export const Canvas = (props: ICanvasProps) => {

  const { style, ...rest } = props
  const canvasRef = useCanvas()
  // useEffect(() => {
  //   if (canvasRef.current) {
  //     canvasRef.current.oncontextmenu = (e) => false;
  //   }
  // }, [canvasRef])
  return <canvas style={style} ref={canvasRef} {...rest}></canvas>
}

// Mouse and Device position
var mouse = {
  x: 0,
  y: 0
}

var circlesMappedById: Map<string, Circle> = new Map();

const useCanvas = () => {
  const canvasRef: React.MutableRefObject<HTMLCanvasElement | null> = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas!.getContext('2d')!
    let frameCount = 0
    let animationFrameId: number

    setup(context, frameCount);

    const postdraw = () => {
      frameCount++
      context.restore()
    }

    const predraw = () => {
      context.save()
      resizeCanvasToDisplaySize(canvas!)
      const { width, height } = context.canvas
      context.clearRect(0, 0, width, height)
    }

    const render = () => {
      predraw()
      circlesMappedById.forEach(c => {
        c.prepareAnimation();
      });
      generateGrid();
      circlesMappedById.forEach(c => {
        c.draw();
      });
      postdraw()

      animationFrameId = window.requestAnimationFrame(render)
    }
    render()

    return () => {
      window.cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return canvasRef
}

export const resizeCanvasToDisplaySize = (canvas: HTMLCanvasElement) => {

  const { width, height } = canvas.getBoundingClientRect()

  if (canvas.width !== width || canvas.height !== height) {
    const { devicePixelRatio: ratio = 1 } = window
    const context = canvas.getContext('2d')!
    canvas.width = width * ratio
    canvas.height = height * ratio
    context.scale(ratio, ratio)
    return true
  }

  return false
}


export const setup = async (ctx: CanvasRenderingContext2D, frameCount: number) => {
  if (window) {

    const registerMousePosition = (e: MouseEvent) => {
      mouse.x = Math.pow((e.clientX - window.innerWidth / 2) / window.innerWidth * 2, 3);
      mouse.y = Math.pow((e.clientY - window.innerHeight / 2) / window.innerHeight * 2, 3);
    }

    // // Event Listeners
    // addEventListener("mousedown", (e) => {
    //   addEventListener("mouseover", registerMousePosition);
    // });

    addEventListener("mousemove", registerMousePosition);


    // addEventListener("mouseup", (e) => {
    //   // removeEventListener("mouseover", registerMousePosition);
    //   // mouse.x = 0;
    //   // mouse.y = 0;
    //   // begin animation to return all circles to original positions
    // });

    circlesMappedById.clear();
    if (circlesMappedById.keys.length === 0) {
      for (let i = 0; i < ((window.innerWidth) * (1 - 2 * EXTERNAL_PADDING_PERCENT) / SPACING); i++) {
        for (let j = 0; j < ((window.innerHeight) * (1 - 2 * EXTERNAL_PADDING_PERCENT) / SPACING); j++) {
          const x = EXTERNAL_PADDING_PERCENT * window.innerWidth + i * SPACING;
          const y = EXTERNAL_PADDING_PERCENT * window.innerHeight + j * SPACING;
          const c = new Circle(ctx, x, y)
          circlesMappedById.set(`${c.guid}`, c);
        }
      }
    }
  }
}

class Circle {
  guid: string = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  color: string = `#3399${(Math.random() * 40 + 184).toString(16).slice(0, 2)}${(Math.random() * 200 + 55).toString(16).slice(0, 2)}`;;
  friction: number = Math.random() / 6 + 1 / 3;
  restitution: number = Math.random() / 6 + 1 / 3;
  x_gravity: number = 0;
  y_gravity: number = 0;
  x_velocity: number = 0;
  y_velocity: number = 0;

  constructor(ctx: CanvasRenderingContext2D, initial_x: number, initial_y: number) {
    this.ctx = ctx;
    this.x = initial_x;
    this.y = initial_y;
  }

  draw = () => {
    // Draw circle
    this.ctx.beginPath();
    this.ctx.arc(this.x, this.y, RADIUS, 0, Math.PI * 2);
    this.ctx.fillStyle = this.color;
    this.ctx.strokeStyle = this.color.slice(0, 7) + "FF";
    this.ctx.shadowColor = this.color.slice(0, 7) + "FF";
    this.ctx.shadowBlur = 10;
    this.ctx.stroke();
    this.ctx.fill();
  }

  calculateGravity = () => {
    this.x_gravity = GRAVITY * (window.innerWidth > window.innerHeight ? window.innerWidth / window.innerHeight : 1) * GRAVITY_MULTIPLIER * (mouse.x);
    this.y_gravity = GRAVITY * (window.innerHeight > window.innerWidth ? window.innerHeight / window.innerWidth : 1) * GRAVITY_MULTIPLIER * (mouse.y);
  }

  calculateVelocity = () => {
    this.x_velocity += this.x_gravity;
    this.y_velocity += this.y_gravity;

    if (this.x_velocity > MAX_VELOCITY) {
      this.x_velocity = MAX_VELOCITY;
    }
    if (this.y_velocity > MAX_VELOCITY) {
      this.y_velocity = MAX_VELOCITY;
    }
  }

  calculatePosition = () => {
    this.x += this.x_velocity * this.friction;
    this.y += this.y_velocity * this.friction;

    if (this.x > window.innerWidth - EXTERNAL_PADDING_PERCENT * window.innerWidth / 2) {
      this.x = window.innerWidth - EXTERNAL_PADDING_PERCENT * window.innerWidth / 2;
      this.x_velocity *= -this.restitution;
    }
    if (this.x < EXTERNAL_PADDING_PERCENT * window.innerWidth / 2) {
      this.x = EXTERNAL_PADDING_PERCENT * window.innerWidth / 2;
      this.x_velocity *= -this.restitution;
    }
    if (this.y > window.innerHeight - EXTERNAL_PADDING_PERCENT * window.innerHeight / 2) {
      this.y = window.innerHeight - EXTERNAL_PADDING_PERCENT * window.innerHeight / 2;
      this.y_velocity *= -this.restitution;
    }
    if (this.y < EXTERNAL_PADDING_PERCENT * window.innerHeight / 2) {
      this.y = EXTERNAL_PADDING_PERCENT * window.innerHeight / 2;
      this.y_velocity *= -this.restitution;
    }
  }

  prepareAnimation = () => {
    this.calculateGravity();
    this.calculateVelocity();
    this.calculatePosition();
  }

}

const calculatePostCollisionVelocities = (c1: Circle, c2: Circle) => {
  // calculate new velocities
  const m1 = 1;
  const m2 = 1;

  const v1_final_x = (m1 * c1.x_velocity + m2 * c2.x_velocity + m2 * c2.x_velocity - m1 * c1.x_velocity) / (m1 + m2);
  const v1_final_y = (m1 * c1.y_velocity + m2 * c2.y_velocity + m2 * c2.y_velocity - m1 * c1.y_velocity) / (m1 + m2);
  const v2_final_x = (m1 * c1.x_velocity + m2 * c2.x_velocity + m1 * c1.x_velocity - m2 * c2.x_velocity) / (m1 + m2);
  const v2_final_y = (m1 * c1.y_velocity + m2 * c2.y_velocity + m1 * c1.y_velocity - m2 * c2.y_velocity) / (m1 + m2);

  c1.x_velocity = v1_final_x;
  c1.y_velocity = v1_final_y;
  c2.x_velocity = v2_final_x;
  c2.y_velocity = v2_final_y;

  if (c1.x_velocity > MAX_VELOCITY) {
    c1.x_velocity = MAX_VELOCITY;
  }
  if (c1.y_velocity > MAX_VELOCITY) {
    c1.y_velocity = MAX_VELOCITY;
  }
  if (c2.x_velocity > MAX_VELOCITY) {
    c2.x_velocity = MAX_VELOCITY;
  }
  if (c2.y_velocity > MAX_VELOCITY) {
    c2.y_velocity = MAX_VELOCITY;
  }

  circlesMappedById.set(c1.guid, c1);
  circlesMappedById.set(c2.guid, c2);
}

const generateGrid = () => {
  // each grid space will have a width and height equal to 2 * radius
  // if more than 1 circle lands within a grid space, we must check if they collide or not
  // we can use calculatePostCollisionVelocities(c1, c2) to calculate new velocities
  // we will start by creating a map of all grid spaces with stringtype keys
  // we will then add circles to the map as we iterate through the circles array. A single circle can be in a maximum of 5 grid spaces at once
  // we will then create pairs and check using function doesCollide(c1, c2) to see if they collide

  // create grid
  const gridWidth = 2 * RADIUS;
  let grid: Map<string, Circle[]> = new Map();
  let circlesArray = Array.from(circlesMappedById.values());
  circlesArray.forEach(c => {
    const smallest_x_grid = c.x % gridWidth !== RADIUS ? Math.floor(c.x / gridWidth) : Math.floor(c.x / gridWidth) - 1;
    const largest_x_grid = c.x % gridWidth !== RADIUS ? Math.ceil(c.x / gridWidth) : Math.ceil(c.x / gridWidth) + 1;
    const smallest_y_grid = c.y % gridWidth !== RADIUS ? Math.floor(c.y / gridWidth) : Math.floor(c.y / gridWidth) - 1;
    const largest_y_grid = c.y % gridWidth !== RADIUS ? Math.ceil(c.y / gridWidth) : Math.ceil(c.y / gridWidth) + 1;

    for (let i = smallest_x_grid; i <= largest_x_grid; i++) {
      for (let j = smallest_y_grid; j <= largest_y_grid; j++) {
        if (grid.has(`${i},${j}`)) {
          grid.get(`${i},${j}`)!.push(c);
        } else {
          grid.set(`${i},${j}`, [c]);
        }
      }
    }

    grid.forEach((value) => {
      if (value.length > 1) {
        value.forEach(c1 => {
          value.forEach(c2 => {
            if (c1.guid !== c2.guid) {
              if (doesCollide(c1, c2)) {
                calculatePostCollisionVelocities(c1, c2);
              }
            }
          });
        });
      }
    });
  })
}

const doesCollide = (c1: Circle, c2: Circle) => {
  // we also need to check if the circles will collide in the next frame
  const nextDistance = Math.sqrt(Math.pow(c1.x + c1.x_velocity - c2.x - c2.x_velocity, 2) + Math.pow(c1.y + c1.y_velocity - c2.y - c2.y_velocity, 2));
  return nextDistance < 2 * RADIUS;
}