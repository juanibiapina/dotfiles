local function source_vimscript(filepath)
  local command = 'source ' .. filepath
  vim.api.nvim_exec(command, false)
end

local home = os.getenv('HOME')
local nvim_config_path = home .. '/.config/nvim/conf/'

source_vimscript(nvim_config_path .. 'plugins.vim')
source_vimscript(nvim_config_path .. 'conf.vim')
source_vimscript(nvim_config_path .. 'auto.vim')
source_vimscript(nvim_config_path .. 'shortcuts.vim')
