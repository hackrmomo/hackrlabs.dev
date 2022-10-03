// adapted from https://medium.com/@pdx.lucasm/canvas-with-react-js-32e133c05258 for typescript
// inspired collision detection system from implementation in https://github.com/JBreidfjord/particle-sim
// lol looks like we didn't use particle collision in the end

import React, { useRef, useEffect } from 'react'

const GRAVITY: number = 9.81;
const GRAVITY_MULTIPLIER: number = 0.01;
const RADIUS: number = 2;
const SPACING: number = 35;
const MAX_VELOCITY: number = 100;
const EXTERNAL_PADDING_PERCENT: number = 0.05;
let X_PADDING: number = 0;
let Y_PADDING: number = 0;

var squaresMappedById: Map<string, Square> = new Map();
interface ICanvasProps {
  style?: React.CSSProperties
}

export const Canvas = (props: ICanvasProps) => {

  const { style, ...rest } = props
  const canvasRef = useCanvas()
  return <>
    <canvas style={style} ref={canvasRef} {...rest}></canvas>
  </>
}

// Mouse and Device position
var mouse = {
  x: 0,
  y: 0,
  down: false
}


const useCanvas = () => {
  const canvasRef: React.MutableRefObject<HTMLCanvasElement | null> = useRef(null);

  addEventListener("resize", () => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      // redo setup at frame 0
      setup(canvas.getContext("2d")!, 0);
    }
  });

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
      squaresMappedById.forEach(s => {
        s.prepareAnimation();
      });
      squaresMappedById.forEach(s => {
        s.draw();
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

const setupEventListeners = () => {

  const registerMousePosition = (e: MouseEvent) => {
    mouse.x = (e.clientX - window.innerWidth / 2) / window.innerWidth * 3
    mouse.y = (e.clientY - window.innerHeight / 2) / window.innerHeight * 3
    mouse.down = e.buttons > 0;
  }

  const registerTouchPosition = (e: TouchEvent) => {
    e.preventDefault();
    mouse.x = (e.touches[0].clientX - window.innerWidth / 2) / window.innerWidth * 3
    mouse.y = (e.touches[0].clientY - window.innerHeight / 2) / window.innerHeight * 3
    mouse.down = e.touches.length > 0;
  }

  addEventListener("touchstart", (event) => {
    addEventListener("touchmove", registerTouchPosition);
    registerTouchPosition(event);
    squaresMappedById.forEach(s => {
      s.cancelReset();
    });
  });

  addEventListener("touchend", (event: TouchEvent) => {
    removeEventListener("touchmove", registerTouchPosition);
    mouse.x = 0;
    mouse.y = 0;
    mouse.down = false;
    if (event.touches.length === 1) {
      removeEventListener("touchmove", registerTouchPosition);
      squaresMappedById.forEach(s => {
        s.reset();
      });
    }
  });

  addEventListener("mousedown", (event: MouseEvent) => {
    addEventListener("mousemove", registerMousePosition);
    registerMousePosition(event);
    squaresMappedById.forEach(s => {
      s.cancelReset();
    });
  });

  addEventListener("mouseup", () => {
    removeEventListener("mousemove", registerMousePosition);
    mouse.x = 0;
    mouse.y = 0;
    mouse.down = false;
  });

  addEventListener("dblclick", () => {
    squaresMappedById.forEach(s => {
      s.reset();
    });
  });

  addEventListener("blur", (e: FocusEvent) => {
    if (e.target === window) {
      removeEventListener("mousemove", registerMousePosition);
      removeEventListener("touchmove", registerTouchPosition);
      mouse.x = 0;
      mouse.y = 0;
      mouse.down = false;
    }
  });
}


export const setup = async (ctx: CanvasRenderingContext2D, frameCount: number) => {
  if (window) {
    setupEventListeners();

    // add squares
    squaresMappedById.clear();
    if (squaresMappedById.keys.length === 0) {
      X_PADDING = window.innerWidth * EXTERNAL_PADDING_PERCENT + (window.innerWidth * (1 - EXTERNAL_PADDING_PERCENT * 2) % SPACING) / 2;
      Y_PADDING = window.innerHeight * EXTERNAL_PADDING_PERCENT + (window.innerHeight * (1 - EXTERNAL_PADDING_PERCENT * 2) % SPACING) / 2;
      for (let i = 0; i < ((window.innerWidth) * (1 - 2 * EXTERNAL_PADDING_PERCENT) / SPACING); i++) {
        for (let j = 0; j < ((window.innerHeight) * (1 - 2 * EXTERNAL_PADDING_PERCENT) / SPACING); j++) {
          const x = X_PADDING + i * SPACING;
          const y = Y_PADDING + j * SPACING;
          const c = new Square(ctx, x, y)
          squaresMappedById.set(`${c.guid}`, c);
        }
      }
    }
  }
}

class Square {
  guid: string = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  ctx: CanvasRenderingContext2D;
  initial_x: number;
  initial_y: number;
  reset_from_x: number;
  reset_from_y: number;
  x: number;
  y: number;
  color: string;
  friction: number = Math.random() * 0.005;
  restitution: number = Math.random() / 6 + 1 / 3;
  x_gravity: number = 0;
  y_gravity: number = 0;
  x_velocity: number = 0;
  y_velocity: number = 0;
  isResetting: boolean = false;

  constructor(ctx: CanvasRenderingContext2D, initial_x: number, initial_y: number) {
    this.ctx = ctx;
    this.x = initial_x;
    this.y = initial_y;
    this.initial_x = initial_x;
    this.initial_y = initial_y;
    this.reset_from_x = this.x;
    this.reset_from_y = this.y;
    this.color = checkOnImageMap(initial_x, initial_y)
      ? `#${(Math.random() * 70 + 100).toString(16).slice(0, 2)}${(Math.random() * 100 + 100).toString(16).slice(0, 2)}${(Math.random() * 155 + 100).toString(16).slice(0, 2)}`
      : "#FFFFFF22"
    console.log(this.initial_x, this.initial_y);
  }

  draw = () => {
    // Draw square
    this.ctx.beginPath();
    this.ctx.rect(this.x - RADIUS, this.y - RADIUS, RADIUS * 2, RADIUS * 2);
    this.ctx.fillStyle = this.color;
    this.ctx.shadowColor = this.color;
    this.ctx.shadowBlur = 5;
    this.ctx.fill();
    this.ctx.lineWidth = 3;
  }

  calculateGravity = () => {
    if (this.isResetting) {
      this.x_gravity = GRAVITY * (this.initial_x - this.x) / window.innerWidth * GRAVITY_MULTIPLIER * 100;
      this.y_gravity = GRAVITY * (this.initial_y - this.y) / window.innerHeight * GRAVITY_MULTIPLIER * 100;
      // this.x_gravity = 0;
      // this.y_gravity = 0;
    } else {
      const x_relative_to_center = (this.x - window.innerWidth / 2) / window.innerWidth * 3
      const y_relative_to_center = (this.y - window.innerHeight / 2) / window.innerHeight * 3
      this.x_gravity = GRAVITY * (window.innerWidth > window.innerHeight ? window.innerWidth / window.innerHeight : 1) * GRAVITY_MULTIPLIER * -(x_relative_to_center - mouse.x) * (mouse.down ? 1 : 0);
      this.y_gravity = GRAVITY * (window.innerHeight > window.innerWidth ? window.innerHeight / window.innerWidth : 1) * GRAVITY_MULTIPLIER * -(y_relative_to_center - mouse.y) * (mouse.down ? 1 : 0);
    }
  }

  calculateVelocity = () => {

    if (this.isResetting) {
      // set velocity to start slow, then speed up, then slow down, then stop from reset_from to initial
      const x_distance = this.reset_from_x - this.initial_x;
      const y_distance = this.reset_from_y - this.initial_y;
      const x_distance_from_initial = this.x - this.initial_x;
      const y_distance_from_initial = this.y - this.initial_y;

      const x_distance_from_initial_percent = Math.abs(x_distance_from_initial / x_distance);
      const y_distance_from_initial_percent = Math.abs(y_distance_from_initial / y_distance);

      this.x_velocity = x_distance_from_initial_percent * -x_distance_from_initial;
      this.y_velocity = y_distance_from_initial_percent * -y_distance_from_initial;
    } else {
      this.x_velocity += this.x_gravity;
      this.y_velocity += this.y_gravity;
      this.x_velocity *= 1 - this.friction;
      this.y_velocity *= 1 - this.friction;
    }

    if (Math.abs(this.x_velocity) > MAX_VELOCITY) {
      this.x_velocity = MAX_VELOCITY * (this.x_velocity > 0 ? 1 : -1);
    }
    if (Math.abs(this.y_velocity) > MAX_VELOCITY) {
      this.y_velocity = MAX_VELOCITY * (this.y_velocity > 0 ? 1 : -1);
    }
  }

  calculatePosition = () => {
    this.x += this.x_velocity; // what about this
    this.y += this.y_velocity; // okay this kinda looks

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
      this.y_velocity *= -this.restitution * 0.9;
    }
    if (this.y < EXTERNAL_PADDING_PERCENT * window.innerHeight / 2) {
      this.y = EXTERNAL_PADDING_PERCENT * window.innerHeight / 2;
      this.y_velocity *= -this.restitution * 0.9;
    }

    if (this.isResetting) {
      if (Math.abs(this.x - this.initial_x) < 1 && Math.abs(this.y - this.initial_y) < 1 && Math.abs(this.x_velocity) < 0.1 && Math.abs(this.y_velocity) < 0.1) {
        this.isResetting = false;
        this.x = this.initial_x;
        this.y = this.initial_y;
        this.x_gravity = 0;
        this.y_gravity = 0;
        this.x_velocity = 0;
        this.y_velocity = 0;
      }
    }
  }

  prepareAnimation = () => {
    this.calculateGravity();
    this.calculateVelocity();
    this.calculatePosition();
  }

  reset = () => {
    this.isResetting = true;
    this.reset_from_x = this.x;
    this.reset_from_y = this.y;
    this.x_gravity = 0;
    this.y_gravity = 0;
  }

  cancelReset = () => {
    this.isResetting = false;
  }

}

const checkOnImageMap = (x: number, y: number) => {
  const smallestDimension = window.innerWidth > window.innerHeight ? window.innerHeight : window.innerWidth;
  const x_offset = (window.innerWidth - smallestDimension) / 2;
  const y_offset = (window.innerHeight - smallestDimension) / 2;
  const x_center = window.innerWidth / 2;
  const y_center = window.innerHeight / 2;

  const unit = smallestDimension / 100;

  if (x < x_offset || x > window.innerWidth - x_offset || y < y_offset || y > window.innerHeight - y_offset) {
    return false;
  }
  if (Math.abs(x - x_center) < unit * 20 && Math.abs(y - y_center) < unit * 20) {
    return true;
  }
  if (Math.abs(x - x_center) >= unit * 20) {
    return true;
  }
  return false;
}