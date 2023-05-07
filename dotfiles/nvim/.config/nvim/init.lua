-- bootstrap lazy
local lazypath = vim.fn.stdpath("data") .. "/lazy/lazy.nvim"
if not vim.loop.fs_stat(lazypath) then
  vim.fn.system({
    "git",
    "clone",
    "--filter=blob:none",
    "https://github.com/folke/lazy.nvim.git",
    "--branch=stable", -- latest stable release
    lazypath,
  })
end
vim.opt.rtp:prepend(lazypath)

-- set leader to space
-- this needs to happen before lazy is setup
vim.g.mapleader = " "
vim.g.maplocalleader = " "

-- load plugins (this loads lua/plugins.lua or lua/plugins/*.lua)
require("lazy").setup("plugins")

-- Setup neoconf
require("neoconf").setup({})

-- Setup fidget
require("fidget").setup({})

require("telescope").setup({
  defaults = {
    mappings = {
      i = {
        ["<esc>"] = require("telescope.actions").close,
        ["<C-j>"] = require("telescope.actions").move_selection_next,
        ["<C-k>"] = require("telescope.actions").move_selection_previous,
      },
    },
  },
})

-- LSP settings.
--  This function gets run when an LSP connects to a particular buffer.
local on_attach = function(_, bufnr)
  local nmap = function(keys, func, desc)
    if desc then
      desc = 'LSP: ' .. desc
    end

    vim.keymap.set('n', keys, func, { buffer = bufnr, desc = desc })
  end

  nmap('<leader>rn', vim.lsp.buf.rename, '[R]e[n]ame')
  nmap('<leader>ca', vim.lsp.buf.code_action, '[C]ode [A]ction')

  nmap('gd', vim.lsp.buf.definition, '[G]oto [D]efinition')
  nmap('gD', vim.lsp.buf.declaration, '[G]oto [D]eclaration')
  nmap('gr', require('telescope.builtin').lsp_references, '[G]oto [R]eferences')
  nmap('gI', vim.lsp.buf.implementation, '[G]oto [I]mplementation')
  nmap('<leader>D', vim.lsp.buf.type_definition, 'Type [D]efinition')
  nmap('<leader>ds', require('telescope.builtin').lsp_document_symbols, '[D]ocument [S]ymbols')
  nmap('<leader>ws', require('telescope.builtin').lsp_dynamic_workspace_symbols, '[W]orkspace [S]ymbols')

  -- See `:help K` for why this keymap
  nmap('K', vim.lsp.buf.hover, 'Hover Documentation')
  nmap('<C-k>', vim.lsp.buf.signature_help, 'Signature Documentation')

  -- Create a command `:Format` local to the LSP buffer
  vim.api.nvim_buf_create_user_command(bufnr, 'Format', function(_)
    vim.lsp.buf.format()
  end, { desc = 'Format current buffer with LSP' })
end

-- Setup neovim lua configuration
require('neodev').setup()

-- nvim-cmp supports additional completion capabilities, so broadcast that to servers
local capabilities = vim.lsp.protocol.make_client_capabilities()
capabilities = require('cmp_nvim_lsp').default_capabilities(capabilities)

-- Language servers to be installed using mason
-- https://github.com/williamboman/mason-lspconfig.nvim#available-lsp-servers
local servers = {
  tsserver = {},
  -- Do not install solargraph since it's a gem. Do this per project instead.
  -- solargraph = {},

  lua_ls = {
    Lua = {
      workspace = { checkThirdParty = false },
      telemetry = { enable = false },
    },
  },
}

require('mason').setup()
require('mason-lspconfig').setup({
  ensure_installed = vim.tbl_keys(servers),

  handlers = {
    function(server_name)
      require('lspconfig')[server_name].setup {
        capabilities = capabilities,
        on_attach = on_attach,
        settings = servers[server_name],
      }
    end,
  }
})

-- nvim-cmp setup
local cmp = require 'cmp'
local luasnip = require 'luasnip'

luasnip.config.setup {}

cmp.setup {
  snippet = {
    expand = function(args)
      luasnip.lsp_expand(args.body)
    end,
  },
  completion = {
    autocomplete = false, -- triggered by a global mapping instead
  },
  mapping = cmp.mapping.preset.insert {
    ['<C-n>'] = cmp.mapping.select_next_item(),
    ['<C-p>'] = cmp.mapping.select_prev_item(),
    ['<C-d>'] = cmp.mapping.scroll_docs(-4),
    ['<C-f>'] = cmp.mapping.scroll_docs(4),
    ['<CR>'] = cmp.mapping.confirm {
      behavior = cmp.ConfirmBehavior.Replace,
      select = true,
    },
  },
  formatting = {
    format = require('lspkind').cmp_format({
      mode = 'symbol_text',
      maxwidth = 50,
      ellipsis_char = '...',
    })
  },
  sources = {
    { name = 'nvim_lsp' },
    { name = 'luasnip' },
  },
}

-- backwards compatibility with my old setup
local function source_vimscript(filepath)
  local command = 'source ' .. filepath
  vim.api.nvim_exec2(command, {output = false})
end

local home = os.getenv('HOME')
local nvim_config_path = home .. '/.config/nvim/conf/'

source_vimscript(nvim_config_path .. 'conf.vim')
source_vimscript(nvim_config_path .. 'auto.vim')

-- nvim-cmp highlight groups (needs to come after the colorscheme is loaded)
vim.api.nvim_command('highlight! link CmpItemAbbrDeprecated Comment')
vim.api.nvim_command('highlight! link CmpItemAbbrMatch Search')
vim.api.nvim_command('highlight! link CmpItemAbbrMatchFuzzy CmpItemAbbrMatch')
vim.api.nvim_command('highlight! link CmpItemKindVariable Identifier')
vim.api.nvim_command('highlight! link CmpItemKindInterface CmpItemKindVariable')
vim.api.nvim_command('highlight! link CmpItemKindText CmpItemKindVariable')
vim.api.nvim_command('highlight! link CmpItemKindFunction Function')
vim.api.nvim_command('highlight! link CmpItemKindMethod CmpItemKindFunction')
vim.api.nvim_command('highlight! link CmpItemKindKeyword Keyword')
vim.api.nvim_command('highlight! link CmpItemKindProperty CmpItemKindKeyword')
vim.api.nvim_command('highlight! link CmpItemKindUnit CmpItemKindKeyword')

require('shortcuts')
