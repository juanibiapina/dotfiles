require "date"

RSpec.describe "vim: organization shortcuts" do

  it "exposes a command to jump to a specific file" do
    # when
    vim.command 'GorgOpenFile file.md'

    # then
    filename = vim.command 'echo @%'
    expect(filename).to eq('file.md')
  end

  it "exposes a Plug mapping for opening a link (not an actual markdown link)" do
    # given
    vim.command 'nmap zz <Plug>GorgOpenFileForCurrentLine'
    vim.command 'set hidden'
    vim.insert '- The Target'
    vim.normal
    vim.feedkeys 'gg'

    # when
    vim.feedkeys 'zz'

    # then
    filename = vim.command 'echo @%'
    expect(filename).to eq('The Target.md')
  end

end
