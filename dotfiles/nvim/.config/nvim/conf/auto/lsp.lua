-- Status updates for LSP
require("fidget").setup({})

-- configure the LSP servers
-- https://github.com/neovim/nvim-lspconfig/blob/master/doc/server_configurations.md
local servers = {
  "gdscript",
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
  }
end

require('lspconfig')["gopls"].setup {
  capabilities = capabilities,
  settings = {
    ["gopls"] = {
      gofumpt = true,
    },
  }
}

require('lspconfig')["rust_analyzer"].setup {
  capabilities = capabilities,
  settings = {
    ["rust-analyzer"] = {
      files = {
        excludeDirs = { ".direnv", ".devenv" },
      },
    }
  }
}
