{ pkgs, inputs, ... }:

let
  todo = pkgs.buildGoModule {
    pname = "todo";
    version = "3.0.0";

    src = inputs.todo;

    vendorHash = "sha256-l6Sa9xTMBT/Bq7DKmUFRLbvJHcKe7wiVBmK+Wc61sGM=";

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
