-- Status updates for LSP
require("fidget").setup({})

--  This function gets run when an LSP connects to a particular buffer.
local on_attach = function(_, bufnr)
  local nmap = function(keys, func, desc)
    if desc then
      desc = 'LSP: ' .. desc
    end

    vim.keymap.set('n', keys, func, { buffer = bufnr, desc = desc })
  end

  -- See `:help K` for why this keymap
  nmap('K', vim.lsp.buf.hover, 'Hover Documentation')
  nmap('<C-k>', vim.lsp.buf.signature_help, 'Signature Documentation')
end

-- configure the LSP servers
-- https://github.com/neovim/nvim-lspconfig/blob/master/doc/server_configurations.md
local servers = {
  "gdscript",
  "gopls",
  "lua_ls",
  "nil_ls",
  "pyright",
  "terraformls",
  "ts_ls",
}

-- local capabilities = vim.lsp.protocol.make_client_capabilities()
local capabilities = require('cmp_nvim_lsp').default_capabilities()

for _, server in ipairs(servers) do
  require('lspconfig')[server].setup {
    capabilities = capabilities,
    on_attach = on_attach,
  }
end

require('lspconfig')["rust_analyzer"].setup {
  capabilities = capabilities,
  on_attach = on_attach,
  settings = {
    ["rust-analyzer"] = {
      files = {
        excludeDirs = { ".direnv", ".devenv" },
      },
    }
  }
}
