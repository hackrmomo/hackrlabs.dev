use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

const GRAVITY: f32 = 9.81;
const GRAVITY_MULTIPLIER: f32 = 0.01;
const EXTERNAL_PADDING_PERCENT: f32 = 0.05;
const MAX_VELOCITY: f32 = 100.0;

#[derive(Serialize, Deserialize)]
pub struct Square {
    x: f32,
    y: f32,
    reset_from_x: f32,
    reset_from_y: f32,
    initial_x: f32,
    initial_y: f32,
    x_velocity: f32,
    y_velocity: f32,
    x_gravity: f32,
    y_gravity: f32,
    friction: f32,
    restitution: f32,
    is_resetting: bool,
}

#[wasm_bindgen]
pub fn check_on_image_map(x: f32, y: f32, height: f32, width: f32) -> bool {
    let smallest_dimension: f32 = if height < width { height } else { width };
    let x_offset: f32 = (width - smallest_dimension) / 2.0;
    let y_offset: f32 = (height - smallest_dimension) / 2.0;
    let x_center: f32 = width / 2.0;
    let y_center: f32 = height / 2.0;

    let unit: f32 = smallest_dimension / 100.0;

    // border
    if x < x_offset || x > width - x_offset || y < y_offset || y > height - y_offset {
        return false;
    }

    // center triangle
    if (f32::abs(x - x_center) / -(y - y_center / 1.5) > 1.0 || y > y_center / 1.5)
        && (f32::abs(x - x_center) / -(y - y_center - y_center * 0.25) < 1.0 && y < y_center * 1.25)
    {
        return true;
    }

    // bars
    if f32::abs(x - x_center) >= unit * 30.0 {
        return true;
    }

    return false;
}

// do not warn about unused code
#[allow(unused_assignments)]
#[wasm_bindgen]
pub fn calculate_position(
    mouse_x: f32,
    mouse_y: f32,
    mouse_down: bool,
    mut x: f32,
    mut y: f32,
    mut x_velocity: f32,
    mut y_velocity: f32,
    mut x_gravity: f32,
    mut y_gravity: f32,
    mut is_resetting: bool,
    reset_from_x: f32,
    reset_from_y: f32,
    friction: f32,
    restitution: f32,
    initial_x: f32,
    initial_y: f32,
    width: f32,
    height: f32,
) -> JsValue {
    // GRAVITY
    if is_resetting {
        x_gravity = GRAVITY * (initial_x - x) / width * GRAVITY_MULTIPLIER * 100.0;
        y_gravity = GRAVITY * (initial_y - y) / height * GRAVITY_MULTIPLIER * 100.0;
    } else {
        let x_relative_to_center = (x - width / 2.0) / width * 3.0;
        let y_relative_to_center = (y - height / 2.0) / height * 3.0;
        x_gravity = GRAVITY * if width > height { width / height } else { 1.0 } * GRAVITY_MULTIPLIER * -(x_relative_to_center - mouse_x) * (if mouse_down { 1.0 } else { 0.0 });
        y_gravity = GRAVITY * if height > width { height / width } else { 1.0 } * GRAVITY_MULTIPLIER * -(y_relative_to_center - mouse_y) * (if mouse_down { 1.0 } else { 0.0 });
    }

    // VELOCITY
    if is_resetting {
        let x_distance = reset_from_x - initial_x;
        let y_distance = reset_from_y - initial_y;
        let x_distance_from_initial = x - initial_x;
        let y_distance_from_initial = y - initial_y;

        let x_distance_from_initial_percent = f32::abs(x_distance_from_initial / x_distance);
        let y_distance_from_initial_percent = f32::abs(y_distance_from_initial / y_distance);

        x_velocity = x_distance_from_initial_percent * -x_distance_from_initial;
        y_velocity = y_distance_from_initial_percent * -y_distance_from_initial;
    } else {
        x_velocity += x_gravity;
        y_velocity += y_gravity;
        x_velocity *= 1.0 - friction;
        y_velocity *= 1.0 - friction;
    }

    if f32::abs(x_velocity) > MAX_VELOCITY {
        x_velocity = MAX_VELOCITY * x_velocity.signum();
    }

    if f32::abs(y_velocity) > MAX_VELOCITY {
        y_velocity = MAX_VELOCITY * y_velocity.signum();
    }

    // POSITION
    x += x_velocity;
    y += y_velocity;

    if x > width - EXTERNAL_PADDING_PERCENT * width / 2.0 {
        x = width - EXTERNAL_PADDING_PERCENT * width / 2.0;
        x_velocity *= -restitution;
    }

    if x < EXTERNAL_PADDING_PERCENT * width / 2.0 {
        x = EXTERNAL_PADDING_PERCENT * width / 2.0;
        x_velocity *= -restitution;
    }

    if y > height - EXTERNAL_PADDING_PERCENT * height / 2.0 {
        y = height - EXTERNAL_PADDING_PERCENT * height / 2.0;
        y_velocity *= -restitution * 0.9;
    }

    if y < EXTERNAL_PADDING_PERCENT * height / 2.0 {
        y = EXTERNAL_PADDING_PERCENT * height / 2.0;
        y_velocity *= -restitution * 0.9;
    }

    if is_resetting {
        if f32::abs(x - initial_x) < 1.0
            && f32::abs(y - initial_y) < 1.0
            && f32::abs(x_velocity) < 0.1
            && f32::abs(y_velocity) < 0.1
        {
            is_resetting = false;
            x = initial_x;
            y = initial_y;
            x_gravity = 0.0;
            y_gravity = 0.0;
            x_velocity = 0.0;
            y_velocity = 0.0;
        }
    }

    serde_wasm_bindgen::to_value(&Square {
        x,
        y,
        reset_from_x,
        reset_from_y,
        initial_x,
        initial_y,
        x_velocity,
        y_velocity,
        x_gravity,
        y_gravity,
        friction,
        restitution,
        is_resetting,
    })
    .unwrap()
}
