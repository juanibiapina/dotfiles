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

  nmap('<leader>ca', vim.lsp.buf.code_action, 'Code action')
  nmap('<leader>fm', vim.lsp.buf.format, 'Format buffer')
  nmap('<leader>rn', vim.lsp.buf.rename, 'Rename')

  nmap('gd', vim.lsp.buf.definition, 'Goto definition')
  nmap('gD', vim.lsp.buf.declaration, 'Goto declaration')
  nmap('gr', require('telescope.builtin').lsp_references, 'Goto references')
  nmap('gI', vim.lsp.buf.implementation, 'Goto implementation')
  nmap('<leader>D', vim.lsp.buf.type_definition, 'Type definition')
  nmap('<leader>ds', require('telescope.builtin').lsp_document_symbols, 'Document symbols')

  -- See `:help K` for why this keymap
  nmap('K', vim.lsp.buf.hover, 'Hover Documentation')
  nmap('<C-k>', vim.lsp.buf.signature_help, 'Signature Documentation')

  -- Create a command `:Format` local to the LSP buffer
  vim.api.nvim_buf_create_user_command(bufnr, 'Format', function(_)
    vim.lsp.buf.format()
  end, { desc = 'Format current buffer with LSP' })
end

-- local capabilities = vim.lsp.protocol.make_client_capabilities()
local capabilities = require('cmp_nvim_lsp').default_capabilities()

-- Language servers to be installed using mason
-- https://github.com/williamboman/mason-lspconfig.nvim#available-lsp-servers
local servers = {
  tsserver = {},
  -- Do not install solargraph since it's a gem. Do this per project instead.
  -- solargraph = {},

  lua_ls = {
    Lua = {
      workspace = { checkThirdParty = false },
    },
  },

  terraformls = {},
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

require('lspconfig').gopls.setup {
  capabilities = capabilities,
  on_attach = on_attach,
}

require('lspconfig').nil_ls.setup {
  capabilities = capabilities,
  on_attach = on_attach,
}
