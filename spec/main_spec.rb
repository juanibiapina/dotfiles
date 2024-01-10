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
    let(:today) { Time.now.strftime('%Y-%m-%d') }
    let(:daily_directory) { Dir.mktmpdir }
    let(:tempfile_path) { File.join(daily_directory, "#{today}.md") }

    before do
      # Set up the daily directory
      vim.command("let g:gorg_done_directory = '#{daily_directory}/'")
    end

    after do
      FileUtils.remove_entry(daily_directory)
    end

    it "moves the current line to daily/YYYY-MM-DD.md" do
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

      # Read the contents of the daily file
      daily_file_contents = File.readlines(tempfile_path)

      # Check if the item has been moved to the daily file
      expect(daily_file_contents[0]).to eq("- Todo item\n")
    end
  end

end
