-- MeanderingProgrammer/render-markdown.nvim
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
    border = "thick",
    position = "left",
    width = "full",
  },
  checkbox = {
    custom = {
      postponed = { raw = '[-]', rendered = '󰥔 ', highlight = 'RenderMarkdownTodo', scope_highlight = nil },
      cancelled = { raw = '[|]', rendered = '󱋭 ', highlight = 'RenderMarkdownTodo', scope_highlight = nil },
      alert = { raw = '[!]', rendered = '󰀨 ', highlight = 'RenderMarkdownTodo', scope_highlight = nil },
    },
  },
}
