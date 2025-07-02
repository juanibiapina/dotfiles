require('render-markdown').setup {
  heading = {
    sign = false,
    border = false,
    left_pad = 0,
    position = "left",
    icons = {
      "█ ",
      "██ ",
      "███ ",
      "████ ",
      "█████ ",
      "██████ ",
    },
  },
  code = {
    sign = false,
    border = "thin",
    position = "right",
    width = "block",
    above = "▁",
    below = "▔",
    language_left = "█",
    language_right = "█",
    language_border = "▁",
    left_pad = 1,
    right_pad = 1,
  },
  checkbox = {
    custom = {
      postponed = { raw = '[-]', rendered = '󰥔 ', highlight = 'RenderMarkdownTodo', scope_highlight = nil },
    },
  },
}
