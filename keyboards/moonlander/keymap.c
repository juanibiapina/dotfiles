#include QMK_KEYBOARD_H
#include "version.h"
#define MOON_LED_LEVEL LED_LEVEL
#ifndef ZSA_SAFE_RANGE
#define ZSA_SAFE_RANGE SAFE_RANGE
#endif

enum custom_keycodes {
  RGB_SLD = ZSA_SAFE_RANGE,
  HSV_0_245_245,
  HSV_74_255_206,
  HSV_152_255_255,
  LEDS_TOGGLE,
};

typedef union {
  uint32_t raw;
  struct {
    bool leds_off : 1;
  };
} user_config_t;

static user_config_t user_config;




const uint16_t PROGMEM keymaps[][MATRIX_ROWS][MATRIX_COLS] = {
  [0] = LAYOUT_moonlander(
    KC_GRAVE,       KC_1,           KC_2,           KC_3,           KC_4,           KC_5,           KC_NO,                                          KC_NO,          KC_6,           KC_7,           KC_8,           KC_9,           KC_0,           KC_BSPC,        
    KC_TAB,         KC_Q,           KC_W,           KC_E,           KC_R,           KC_T,           KC_NO,                                          KC_NO,          KC_Y,           KC_U,           KC_I,           KC_O,           KC_P,           KC_BSLS,        
    KC_CAPS,        KC_A,           KC_S,           KC_D,           KC_F,           KC_G,           KC_NO,                                                                          KC_NO,          KC_H,           KC_J,           KC_K,           KC_L,           KC_SCLN,        KC_QUOTE,       
    KC_LEFT_SHIFT,  KC_Z,           KC_X,           KC_C,           KC_V,           KC_B,                                           KC_N,           KC_M,           KC_COMMA,       KC_DOT,         KC_SLASH,       KC_RIGHT_SHIFT, 
    MO(1),          KC_MINUS,       KC_NO,          KC_LEFT_ALT,    KC_LEFT_GUI,    KC_NO,                                                                                                          KC_NO,          KC_NO,          KC_NO,          KC_LBRC,        KC_RBRC,        MO(1),          
    KC_SPACE,       KC_BSPC,        KC_F24,                         MO(2),          KC_NO,          KC_ENTER
  ),
  [1] = LAYOUT_moonlander(
    KC_ESCAPE,      KC_F1,          KC_F2,          KC_F3,          KC_F4,          KC_F5,          KC_NO,                                          KC_NO,          KC_F6,          KC_F7,          KC_F8,          KC_F9,          KC_F10,         KC_F11,         
    KC_NO,          KC_NO,          KC_NO,          KC_NO,          KC_NO,          KC_NO,          KC_NO,                                          KC_NO,          KC_PGUP,        KC_7,           KC_8,           KC_9,           KC_NO,          KC_F12,         
    KC_NO,          KC_NO,          KC_NO,          KC_NO,          KC_NO,          KC_NO,          KC_NO,                                                                          KC_NO,          KC_PGDN,        KC_4,           KC_5,           KC_6,           KC_KP_PLUS,     KC_NO,          
    KC_NO,          KC_NO,          KC_NO,          KC_NO,          KC_NO,          KC_NO,                                          KC_NO,          KC_1,           KC_2,           KC_3,           KC_NO,          KC_NO,          
    KC_NO,          KC_NO,          HSV_0_245_245,  HSV_74_255_206, HSV_152_255_255,RGB_MODE_FORWARD,                                                                                                LEDS_TOGGLE,    KC_NO,          KC_NO,          KC_0,           KC_EQUAL,       KC_NO,          
    RGB_VAD,        RGB_VAI,        TOGGLE_LAYER_COLOR,                RGB_SLD,        RGB_HUD,        RGB_HUI
  ),
  [2] = LAYOUT_moonlander(
    AU_TOGG,        KC_NO,          KC_NO,          KC_NO,          KC_NO,          KC_NO,          KC_NO,                                          KC_NO,          KC_NO,          KC_NO,          KC_NO,          KC_NO,          KC_NO,          QK_BOOT,        
    MU_TOGG,        KC_NO,          KC_NO,          KC_NO,          KC_NO,          KC_NO,          KC_NO,                                          KC_NO,          KC_NO,          KC_NO,          KC_NO,          KC_NO,          KC_NO,          KC_NO,          
    MU_NEXT,        KC_NO,          KC_NO,          KC_NO,    KC_NO,          KC_NO,          KC_NO,                                                                          KC_NO,          KC_NO,          KC_NO,          KC_NO,          KC_NO,          KC_NO,          KC_MEDIA_PLAY_PAUSE,
    KC_NO,          KC_NO,          KC_NO,          KC_NO,          KC_NO,          KC_NO,                                          KC_NO,          KC_NO,          KC_MEDIA_PREV_TRACK,KC_MEDIA_NEXT_TRACK,KC_NO,          KC_NO,          
    KC_NO,          KC_NO,          KC_NO,          KC_NO,          KC_NO,          KC_NO,                                                                                                          KC_NO,          KC_AUDIO_VOL_UP,KC_AUDIO_VOL_DOWN,KC_AUDIO_MUTE,  KC_NO,          KC_NO,          
    KC_NO,          KC_NO,          KC_NO,                          KC_NO,          KC_NO,          KC_NO
  ),
};










enum {
  HUE_MOD   = 31,
  HUE_LAYER = 166,
  HUE_EDIT  = 0,
  HUE_NUM   = 101,
  HUE_SYM   = 59,
  HUE_FN    = 191,
  HUE_NAV   = 141,
  HUE_LIGHT = 233,
  HUE_PLAY  = 122,
  HUE_VOL   = 19,
  HUE_SOUND = 207,
  HUE_BOOT  = 0,
};

static HSV key_colour(uint8_t layer, keypos_t pos) {
  uint16_t keycode = keymap_key_to_keycode(layer, pos);

  switch (keycode) {
    case KC_NO:
    case KC_TRNS:
      return (HSV){0, 0, 0};
    case KC_LEFT_CTRL ... KC_RIGHT_GUI:
    case KC_F24:
      return (HSV){HUE_MOD, 255, 255};
    case KC_BSPC:
    case KC_DEL:
    case KC_ENTER:
    case KC_TAB:
    case KC_SPACE:
    case KC_ESCAPE:
    case KC_CAPS:
    case KC_APP:
      return (HSV){HUE_EDIT, 255, 255};
    case KC_1 ... KC_0:
      return (HSV){HUE_NUM, 255, 255};
    case KC_F1 ... KC_F12:
    case KC_F13 ... KC_F23:
      return (HSV){HUE_FN, 255, 255};
    case KC_RIGHT ... KC_UP:
    case KC_PGUP:
    case KC_PGDN:
      return (HSV){HUE_NAV, 255, 255};
    case RGB_SLD ... LEDS_TOGGLE:
    case TOGGLE_LAYER_COLOR:
      return (HSV){HUE_LIGHT, 255, 255};
    case KC_MEDIA_PLAY_PAUSE:
    case KC_MEDIA_PREV_TRACK:
    case KC_MEDIA_NEXT_TRACK:
      return (HSV){HUE_PLAY, 255, 255};
    case KC_AUDIO_VOL_UP:
    case KC_AUDIO_VOL_DOWN:
    case KC_AUDIO_MUTE:
      return (HSV){HUE_VOL, 255, 255};
    case QK_BOOT:
      return (HSV){HUE_BOOT, 255, 255};
  }
  if (IS_QK_MOMENTARY(keycode) || IS_QK_LAYER_TAP(keycode)) return (HSV){HUE_LAYER, 255, 255};
  if (IS_QK_AUDIO(keycode)) return (HSV){HUE_SOUND, 255, 255};
  if (IS_UNDERGLOW_KEYCODE(keycode) || IS_RGB_MATRIX_KEYCODE(keycode)) return (HSV){HUE_LIGHT, 255, 255};
  if (layer == 1 && pos.row < MATRIX_ROWS / 2) return (HSV){HUE_SYM, 255, 255};
  return (HSV){0, 0, 255};
}

bool rgb_matrix_indicators_advanced_user(uint8_t led_min, uint8_t led_max) {
  if (rawhid_state.rgb_control) return false;
  uint8_t layer = get_highest_layer(layer_state);
  if (layer == 0 || keyboard_config.disable_layer_led) return false;
  for (uint8_t row = 0; row < MATRIX_ROWS; row++) {
    for (uint8_t col = 0; col < MATRIX_COLS; col++) {
      uint8_t led = g_led_config.matrix_co[row][col];
      if (led == NO_LED || led < led_min || led >= led_max) continue;
      HSV hsv = key_colour(layer, (keypos_t){.row = row, .col = col});
      if (hsv.v) hsv.v = rgb_matrix_get_val();
      RGB rgb = hsv_to_rgb(hsv);
      rgb_matrix_set_color(led, rgb.r, rgb.g, rgb.b);
    }
  }
  return false;
}

static void apply_leds(void) {
  bool on = !user_config.leds_off;
  keyboard_config.led_level = on;
  if (on) {
    rgb_matrix_enable_noeeprom();
    layer_state_set_kb(layer_state);
  } else {
    rgb_matrix_disable_noeeprom();
    STATUS_LED_1(false);
    STATUS_LED_2(false);
    STATUS_LED_3(false);
    STATUS_LED_4(false);
    STATUS_LED_5(false);
    STATUS_LED_6(false);
  }
}

void eeconfig_init_user(void) {
  user_config.raw = 0;
  eeconfig_update_user(user_config.raw);
}

void keyboard_post_init_user(void) {
  user_config.raw = eeconfig_read_user();
  if (rgb_matrix_get_flags() != LED_FLAG_ALL) rgb_matrix_set_flags(LED_FLAG_ALL);
  apply_leds();
}

bool process_record_user(uint16_t keycode, keyrecord_t *record) {
  switch (keycode) {
  case QK_MODS ... QK_MODS_MAX: 
    // Mouse keys with modifiers work inconsistently across operating systems, this makes sure that modifiers are always
    // applied to the mouse key that was pressed.
    if (IS_MOUSE_KEYCODE(QK_MODS_GET_BASIC_KEYCODE(keycode))) {
    if (record->event.pressed) {
        add_mods(QK_MODS_GET_MODS(keycode));
        send_keyboard_report();
        wait_ms(2);
        register_code(QK_MODS_GET_BASIC_KEYCODE(keycode));
        return false;
      } else {
        wait_ms(2);
        del_mods(QK_MODS_GET_MODS(keycode));
      }
    }
    break;

    case LEDS_TOGGLE:
        if (record->event.pressed) {
            user_config.leds_off ^= 1;
            eeconfig_update_user(user_config.raw);
            apply_leds();
        }
        return false;
    case RGB_SLD:
        if (rawhid_state.rgb_control) {
            return false;
        }
        if (record->event.pressed) {
            rgblight_mode(1);
        }
        return false;
    case HSV_0_245_245:
        if (rawhid_state.rgb_control) {
            return false;
        }
        if (record->event.pressed) {
            rgblight_mode(1);
            rgblight_sethsv(0,245,245);
        }
        return false;
    case HSV_74_255_206:
        if (rawhid_state.rgb_control) {
            return false;
        }
        if (record->event.pressed) {
            rgblight_mode(1);
            rgblight_sethsv(74,255,206);
        }
        return false;
    case HSV_152_255_255:
        if (rawhid_state.rgb_control) {
            return false;
        }
        if (record->event.pressed) {
            rgblight_mode(1);
            rgblight_sethsv(152,255,255);
        }
        return false;
  }
  return true;
}

