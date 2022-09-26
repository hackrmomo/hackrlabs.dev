// adapted from https://medium.com/@pdx.lucasm/canvas-with-react-js-32e133c05258 for typescript
// inspired collision detection system from implementation in https://github.com/JBreidfjord/particle-sim
// lol looks like we didn't use particle collision in the end

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

    const registerTouchPosition = (e: TouchEvent) => {
      mouse.x = Math.pow((e.touches[0].clientX - window.innerWidth / 2) / window.innerWidth * 2, 3);
      mouse.y = Math.pow((e.touches[0].clientY - window.innerHeight / 2) / window.innerHeight * 2, 3);
    }

    addEventListener("mousemove", registerMousePosition);
    addEventListener("touchmove", registerTouchPosition);

    addEventListener("focus", (e: FocusEvent) => {
      if (e.target === window) {
        addEventListener("mousemove", registerMousePosition);
        addEventListener("touchmove", registerTouchPosition);
      }
    })

    addEventListener("blur", (e: FocusEvent) => {
      if (e.target === window) {
        removeEventListener("mousemove", registerMousePosition);
        removeEventListener("touchmove", registerTouchPosition);
        mouse.x = 0;
        mouse.y = 0;
      }
    });



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
  friction: number = Math.random() * 0.01;
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

    this.x_velocity *= 1 - this.friction;
    this.y_velocity *= 1 - this.friction;

    if (this.x_velocity > MAX_VELOCITY) {
      this.x_velocity = MAX_VELOCITY;
    }
    if (this.y_velocity > MAX_VELOCITY) {
      this.y_velocity = MAX_VELOCITY;
    }
  }

  calculatePosition = () => {
    this.x += this.x_velocity;
    this.y += this.y_velocity;

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