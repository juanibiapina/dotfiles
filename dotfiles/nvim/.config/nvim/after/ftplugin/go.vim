Shortcut Go: Go to definition
      \ nmap <buffer>    <LocalLeader>ld        :GoDef<CR>
Shortcut Go: Find interfaces that this type implements
      \ nmap <buffer>    <LocalLeader>li        :GoImplements<CR>
Shortcut Go: Get References
      \ nmap <buffer>    <LocalLeader>lr        :GoReferrers<CR>
Shortcut Go: Run tests for current file
      \ nmap <buffer>    <LocalLeader>vt        :GoTest<CR>
Shortcut Go: Run all tests
      \ nmap <buffer>    <LocalLeader>vT        :GoTest -v -p=1 ./... -count=1<CR>
