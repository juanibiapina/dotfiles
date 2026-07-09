{ inputs, ... }:

{
  # Deploy the deltoids pi extension from the same flake input that builds the
  # deltoids binary (see nix/modules/deltoids.nix). Sourcing both from
  # inputs.deltoids keeps the extension and the binary at the same rev, so their
  # version-coupled subcommands and JSON schemas can never drift. Bump both with
  # `nix flake update deltoids`.
  home.file.".pi/agent/extensions/deltoids.ts".source =
    "${inputs.deltoids}/plugins/pi/extensions/deltoids.ts";
}
