{ pkgs, inputs, ... }:

let
  todo = pkgs.buildGoModule {
    pname = "todo";
    version = "3.0.0";

    src = inputs.todo;

    vendorHash = "sha256-cC5JfpEJLUf0q5iqiWTW5aaE5kguVS5CM0qkDW4h6yk=";

    ldflags = [
      "-X github.com/juanibiapina/todo/internal/version.Version=3.0.0"
    ];

    meta = with pkgs.lib; {
      description = "Per-directory todo list CLI";
      homepage = "https://github.com/juanibiapina/todo";
      license = licenses.mit;
      platforms = platforms.all;
    };
  };
in
{
  environment.systemPackages = [ todo ];
}
