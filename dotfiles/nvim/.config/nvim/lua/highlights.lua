local colors = {
  '#073642',
  '#dc322f',
  '#859900',
  '#b58900',
  '#268bd2',
  '#d33682',
  '#2aa198',
  '#eee8d5',
  '#002b36',
  '#cb4b16',
  '#586e75',
  '#657b83',
  '#839496',
  '#6c71c4',
  '#93a1a1',
  '#fdf6e3',
}

local c = {
  red = colors[2],
  green = colors[3],
  blue = colors[5],

  yellow = colors[4],
  magenta = colors[6],
  cyan = colors[7],

  fg = colors[8],
  bg = colors[9],

  fg_alternate = colors[16],
  bg_alternate = colors[1],
}

vim.api.nvim_set_hl(0, "NormalFloat", { fg = c.fg_alternate, bg = c.bg_alternate })
