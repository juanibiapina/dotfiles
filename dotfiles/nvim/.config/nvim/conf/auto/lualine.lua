require('lualine').setup {
  options = {
    theme = 'solarized_dark',
  },
  sections = {
    lualine_a = {'branch', 'diff', 'diagnostics'},
    lualine_b = {'filename'},
    lualine_c = {},
    lualine_x = {},
    lualine_y = {'progress'},
    lualine_z = {'location'}
  },
}
