{ pkgs }:

pkgs.buildGoModule rec {
  pname = "alpaca-cli";
  version = "0.0.5";

  src = pkgs.fetchFromGitHub {
    owner = "alpacahq";
    repo = "cli";
    rev = "v${version}";
    hash = "sha256-Q1LyM2KN1m//vetucqvNUQJ+p0IG8nApn9nVMxXpFvQ=";
  };

  vendorHash = "sha256-1jWJQwzS3PZlwX49hAJk8DGaIN2wUt6mzXilpSVKXFM=";

  subPackages = [ "cmd/alpaca" ];

  meta = {
    description = "CLI for Alpaca Trading API";
    homepage = "https://github.com/alpacahq/cli";
  };
}
