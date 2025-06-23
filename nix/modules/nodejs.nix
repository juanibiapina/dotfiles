{ pkgs, ... }:

{
  environment.systemPackages = with pkgs; [
    nodePackages.typescript-language-server
  ];

  homebrew = {
    brews = [
      "mise" # version manager
      "node" # Node.js runtime
    ];
  };
}
