require "date"
require "tempfile"

RSpec.describe "vim: organization shortcuts" do

  it "exposes a command to jump to a specific file" do
    # when
    vim.command 'GorgOpenFile file.md'

    # then
    filename = vim.command 'echo @%'
    expect(filename).to eq('file.md')
  end

  describe "opening links with a Plug mapping" do
    it "from an obsidian link, one per line" do
      # given
      vim.command 'nmap zz <Plug>GorgOpenFileForCurrentLine'
      vim.command 'set hidden'
      vim.insert '- This is [[The Target]]'
      vim.normal
      vim.feedkeys 'gg'

      # when
      vim.feedkeys 'zz'

      # then
      filename = vim.command 'echo @%'
      expect(filename).to eq('The Target.md')
    end

    it "from an obsidian link, two per line, not on link" do
      # given
      vim.command 'nmap zz <Plug>GorgOpenFileForCurrentLine'
      vim.command 'set hidden'
      vim.insert '- a [[The Target]] a [[The Other Target]]'
      vim.normal
      vim.feedkeys 'gg'

      # when
      vim.feedkeys 'zz'

      # then
      filename = vim.command 'echo @%'
      expect(filename).to eq('')
    end

    it "from an obsidian link, two per line, first link" do
      # given
      vim.command 'nmap zz <Plug>GorgOpenFileForCurrentLine'
      vim.command 'set hidden'
      vim.insert '- a [[The Target]] a [[The Other Target]]'
      vim.normal
      vim.feedkeys 'gglllllll'

      # when
      vim.feedkeys 'zz'

      # then
      filename = vim.command 'echo @%'
      expect(filename).to eq('The Target.md')
    end

    it "from an obsidian link, two per line, second link" do
      # given
      vim.command 'nmap zz <Plug>GorgOpenFileForCurrentLine'
      vim.command 'set hidden'
      vim.insert '- a [[The Target]] a [[The Other Target]]'
      vim.normal
      vim.feedkeys 'ggllllllllllllllllllllllll'

      # when
      vim.feedkeys 'zz'

      # then
      filename = vim.command 'echo @%'
      expect(filename).to eq('The Other Target.md')
    end

    it "from a list item" do
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

  describe "GorgCompleteItem" do
    let(:tempfile) { Tempfile.new('Done.md') }

    before do
      # Set up the Done.md file
      vim.command("let g:gorg_done_filename = '#{tempfile.path}'")
    end

    after do
      tempfile.unlink
    end

    it "moves the current line to Done.md under a section with the current ISO date" do
      # Given
      vim.command 'nmap zz <Plug>GorgCompleteItem'
      vim.command 'set hidden'
      vim.insert '- Todo item'
      vim.normal
      vim.feedkeys 'gg'

      # When
      vim.feedkeys 'zz'

      # Check if the current line has been deleted
      expect(vim.command('echo getline("1")')).to eq('')

      # Read the contents of Done.md
      done_md_contents = File.readlines(tempfile.path)

      # Check if the section with the current date exists
      today = Time.now.strftime('%Y-%m-%d')
      expect(done_md_contents[0]).to eq("# #{today}\n")

      # Check if the todo item has been moved to Done.md
      expect(done_md_contents[1]).to eq("- Todo item\n")
    end
  end

end
