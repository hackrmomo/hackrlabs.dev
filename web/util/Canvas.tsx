// adapted from https://medium.com/@pdx.lucasm/canvas-with-react-js-32e133c05258 for typescript
// inspired collision detection system from implementation in https://github.com/JBreidfjord/particle-sim
// lol looks like we didn't use particle collision in the end

import React, { useRef, useEffect } from 'react';
import init, { check_on_image_map, calculate_position } from "../wasm/main"

const RADIUS: number = 2;
const SPACING: number = 35;
const EXTERNAL_PADDING_PERCENT: number = 0.05;
let X_PADDING: number = 0;
let Y_PADDING: number = 0;

var squaresMappedById: Map<string, Square> = new Map();
interface ICanvasProps {
  style?: React.CSSProperties
}

export const Canvas = (props: ICanvasProps) => {
  const { style, ...rest } = props

  let canvasRef: React.MutableRefObject<HTMLCanvasElement | null> | null = useCanvas();
  return <>
    {canvasRef && <canvas style={style} ref={canvasRef} {...rest}></canvas>}
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
  const [wasmInstantiated, setWasmInstantiated] = React.useState(false);
  useEffect(() => {
    init().then(() => {
      setWasmInstantiated(true);
    });
  }, []);

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
    if (!wasmInstantiated) {
      return;
    }

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
  }, [wasmInstantiated])

  return wasmInstantiated ? canvasRef : null;
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
  is_resetting: boolean = false;

  constructor(ctx: CanvasRenderingContext2D, initial_x: number, initial_y: number) {
    this.ctx = ctx;
    this.x = initial_x;
    this.y = initial_y;
    this.initial_x = initial_x;
    this.initial_y = initial_y;
    this.reset_from_x = this.x;
    this.reset_from_y = this.y;
    this.color = check_on_image_map(initial_x, initial_y, innerHeight, innerWidth)
      ? `#${(Math.random() * 70 + 100).toString(16).slice(0, 2)}${(Math.random() * 100 + 100).toString(16).slice(0, 2)}${(Math.random() * 155 + 100).toString(16).slice(0, 2)}`
      : "#FFFFFF22"
    console.log(this.initial_x, this.initial_y);
  }

  draw = () => {
    // Draw square
    this.ctx.beginPath();
    this.ctx.rect(this.x - RADIUS, this.y - RADIUS, RADIUS * 2, RADIUS * 2);
    this.ctx.fillStyle = this.color;
    this.ctx.fill();
    this.ctx.lineWidth = 3;
  }

  prepareAnimation = () => {
    try {
      let s = calculate_position(
        mouse.x,
        mouse.y,
        mouse.down,
        this.x,
        this.y,
        this.x_velocity,
        this.y_velocity,
        this.x_gravity,
        this.y_gravity,
        this.is_resetting,
        this.reset_from_x,
        this.reset_from_y,
        this.friction,
        this.restitution,
        this.initial_x,
        this.initial_y,
        window.innerWidth,
        window.innerHeight
         ) as Square;
      this.x = s.x;
      this.y = s.y;
      this.x_velocity = s.x_velocity;
      this.y_velocity = s.y_velocity;
      this.x_gravity = s.x_gravity;
      this.y_gravity = s.y_gravity;
      this.is_resetting = s.is_resetting;
    } catch (e) {
      console.log(e);
    }
  }

  reset = () => {
    this.is_resetting = true;
    this.reset_from_x = this.x;
    this.reset_from_y = this.y;
    this.x_gravity = 0;
    this.y_gravity = 0;
  }

  cancelReset = () => {
    this.is_resetting = false;
  }

}